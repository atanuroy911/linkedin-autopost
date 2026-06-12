import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { Campaign, buildCronExpression } from '@/lib/db/models/Campaign'
import { activateCampaign, deactivateCampaign } from '../route'
import { z } from 'zod'

/** GET /api/campaigns/[id] */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const campaign = await Campaign.findOne({ _id: id, userId: session.user.id })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ campaign })
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  tone: z.string().optional(),
  examplePosts: z.array(z.string()).max(3).optional(),
  schedule: z.object({
    frequency: z.enum(['weekly', 'monthly']),
    daysOfWeek: z.array(z.number().min(0).max(6)).default([]),
    daysOfMonth: z.array(z.number().min(1).max(31)).default([]),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().default('UTC'),
  }).optional(),
  approvalMode: z.enum(['auto', 'email']).optional(),
  isActive: z.boolean().optional(),
})

/** PATCH /api/campaigns/[id] — update editable fields (NOT niche) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()
  const campaign = await Campaign.findOne({ _id: id, userId: session.user.id })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, description, tone, examplePosts, schedule, approvalMode, isActive } = parsed.data

  let updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (tone !== undefined) updates.tone = tone
  if (examplePosts !== undefined) updates.examplePosts = examplePosts.filter(Boolean)
  if (approvalMode !== undefined) updates.approvalMode = approvalMode

  // Schedule update — rebuild cron and re-schedule if active
  if (schedule) {
    const cronExpression = buildCronExpression({
      frequency: schedule.frequency,
      daysOfWeek: schedule.daysOfWeek,
      daysOfMonth: schedule.daysOfMonth,
      time: schedule.time,
      timezone: schedule.timezone,
    })
    updates.schedule = { ...schedule, cronExpression }

    // If active, re-schedule with the new cron
    if (campaign.isActive) {
      await deactivateCampaign(id)
      await activateCampaign(id, cronExpression, schedule.timezone)
      updates.isActive = true
    }
  }

  // Toggle activation
  if (isActive !== undefined && isActive !== campaign.isActive) {
    if (isActive) {
      const cron = (updates.schedule as any)?.cronExpression || campaign.schedule.cronExpression
      const tz = (updates.schedule as any)?.timezone || campaign.schedule.timezone
      await activateCampaign(id, cron, tz)
      updates.isActive = true
    } else {
      await deactivateCampaign(id)
      updates.isActive = false
    }
  }

  const updated = await Campaign.findByIdAndUpdate(id, updates, { new: true })
  return NextResponse.json({ success: true, campaign: updated })
}

/** DELETE /api/campaigns/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const campaign = await Campaign.findOne({ _id: id, userId: session.user.id })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Stop the repeating job first
  if (campaign.isActive) {
    await deactivateCampaign(id)
  }

  await Campaign.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}
