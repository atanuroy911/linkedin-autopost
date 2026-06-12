import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { Campaign, buildCronExpression } from '@/lib/db/models/Campaign'
import { getQueue, QUEUES } from '@/workers/queues'
import { z } from 'zod'

const scheduleSchema = z.object({
  frequency: z.enum(['weekly', 'monthly']),
  daysOfWeek: z.array(z.number().min(0).max(6)).default([]),
  daysOfMonth: z.array(z.number().min(1).max(31)).default([]),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().default('UTC'),
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  niche: z.object({
    industry: z.string().min(1),
    topics: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
  }),
  tone: z.string().default('Professional'),
  examplePosts: z.array(z.string()).max(3).default([]),
  schedule: scheduleSchema,
  approvalMode: z.enum(['auto', 'email']).default('email'),
  isActive: z.boolean().default(false),
})

/** GET /api/campaigns — list all campaigns for the current user */
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const campaigns = await Campaign.find({ userId: session.user.id }).sort({ createdAt: -1 })
  return NextResponse.json({ campaigns })
}

/** POST /api/campaigns — create a campaign */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, description, niche, tone, examplePosts, schedule, approvalMode, isActive } = parsed.data

  const cronExpression = buildCronExpression({
    frequency: schedule.frequency,
    daysOfWeek: schedule.daysOfWeek,
    daysOfMonth: schedule.daysOfMonth,
    time: schedule.time,
    timezone: schedule.timezone,
  })

  await connectDB()

  const campaign = await Campaign.create({
    userId: session.user.id,
    name,
    description,
    niche,
    tone,
    examplePosts: examplePosts.filter(Boolean),
    schedule: { ...schedule, cronExpression },
    approvalMode,
    isActive: false, // always start inactive, activate separately
    postsGenerated: 0,
  })

  // Activate if requested
  if (isActive) {
    await activateCampaign(campaign._id.toString(), cronExpression, schedule.timezone)
    await Campaign.findByIdAndUpdate(campaign._id, { isActive: true })
  }

  const fresh = await Campaign.findById(campaign._id)
  return NextResponse.json({ success: true, campaign: fresh }, { status: 201 })
}

/** Shared helper: add a repeating BullMQ job for the campaign */
export async function activateCampaign(campaignId: string, cronExpression: string, timezone: string) {
  const queue = getQueue(QUEUES.CAMPAIGN_RUNNER)
  
  // Add the repeating job
  const job = await queue.add(
    'run-campaign',
    { campaignId },
    {
      repeat: { pattern: cronExpression, tz: timezone },
      removeOnComplete: { count: 20 },
      removeOnFail: { count: 10 },
    }
  )

  // Store the repeat key so we can remove it later
  const repeatableJobs = await queue.getRepeatableJobs()
  const repeatJob = repeatableJobs.find(
    (j) => j.pattern === cronExpression || j.key.includes(campaignId)
  )
  const repeatJobKey = repeatJob?.key || job.id || ''
  
  await Campaign.findByIdAndUpdate(campaignId, { repeatJobKey })
  return repeatJobKey
}

/** Shared helper: remove the repeating job for a campaign */
export async function deactivateCampaign(campaignId: string) {
  const campaign = await Campaign.findById(campaignId)
  if (!campaign?.repeatJobKey) return

  const queue = getQueue(QUEUES.CAMPAIGN_RUNNER)
  
  try {
    await queue.removeRepeatableByKey(campaign.repeatJobKey)
  } catch (err: unknown) {
    // Key might already be gone — find and remove by scanning
    const repeatableJobs = await queue.getRepeatableJobs()
    const match = repeatableJobs.find(
      (j) => j.key === campaign.repeatJobKey || j.pattern === campaign.schedule.cronExpression
    )
    if (match) await queue.removeRepeatableByKey(match.key)
  }
  
  await Campaign.findByIdAndUpdate(campaignId, { repeatJobKey: null, isActive: false })
}
