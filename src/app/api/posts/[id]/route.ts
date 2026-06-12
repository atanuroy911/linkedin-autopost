import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { GeneratedPost } from '@/lib/db/models/GeneratedPost'
import { ScheduledPost } from '@/lib/db/models/ScheduledPost'
import { PublishedPost } from '@/lib/db/models/PublishedPost'
import { LinkedInAccount } from '@/lib/db/models/LinkedInAccount'
import { getQueue, QUEUES } from '@/workers/queues'
import { publishToLinkedIn } from '@/lib/linkedin/publish'
import { z } from 'zod'
import mongoose from 'mongoose'

// GET /api/posts/[id] — get a single post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const post = await GeneratedPost.findOne({ _id: id, userId: session.user.id }).populate('mediaAssetIds')
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(post)
}

const updatePostSchema = z.object({
  content: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  postType: z.enum(['text', 'image', 'video', 'link', 'document']).optional(),
  mediaAssetIds: z.array(z.string()).optional(),
  externalUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'pending_approval', 'approved', 'rejected']).optional(),
  rejectionReason: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
})

// PATCH /api/posts/[id] — update post (edit content, approve, reject)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = updatePostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()
  const update: Record<string, unknown> = { ...parsed.data }

  if (parsed.data.status === 'approved') {
    update.approvedAt = new Date()
  } else if (parsed.data.status === 'rejected') {
    update.rejectedAt = new Date()
  }

  if (parsed.data.mediaAssetIds) {
    update.mediaAssetIds = parsed.data.mediaAssetIds.map((id) => new mongoose.Types.ObjectId(id))
  }

  const post = await GeneratedPost.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    update,
    { new: true }
  ).populate('mediaAssetIds')

  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(post)
}

const publishSchema = z.object({
  action: z.enum(['publish_now', 'schedule']),
  scheduledFor: z.string().optional(),
  timezone: z.string().default('UTC'),
})

// POST /api/posts/[id]/publish — publish or schedule a post
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = publishSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const post = await GeneratedPost.findOne({ _id: id, userId: session.user.id })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!['approved', 'draft'].includes(post.status)) {
    return NextResponse.json({ error: 'Post must be approved before publishing' }, { status: 400 })
  }

  if (parsed.data.action === 'publish_now') {
    const linkedInAccount = await LinkedInAccount.findOne({ userId: session.user.id, isConnected: true })
    if (!linkedInAccount) {
      return NextResponse.json({ error: 'No LinkedIn account connected' }, { status: 400 })
    }

    const fullContent = `${post.content}\n\n${post.hashtags.map((h: string) => `#${h}`).join(' ')}`
    const result = await publishToLinkedIn({
      encryptedAccessToken: linkedInAccount.accessToken,
      linkedinUserId: linkedInAccount.linkedinId,
      content: fullContent,
      postType: post.postType,
    })

    await PublishedPost.create({
      userId: session.user.id,
      generatedPostId: post._id,
      linkedinPostId: result.postId,
      linkedinPostUrl: result.postUrl,
      content: post.content,
      hashtags: post.hashtags,
      postType: post.postType,
      mediaAssetIds: post.mediaAssetIds,
      externalUrl: post.externalUrl,
      publishedAt: new Date(),
      publishMethod: 'manual',
    })

    await GeneratedPost.findByIdAndUpdate(id, { status: 'published' })

    return NextResponse.json({ success: true, postUrl: result.postUrl })
  }

  // Schedule post
  if (!parsed.data.scheduledFor) {
    return NextResponse.json({ error: 'scheduledFor is required for scheduling' }, { status: 400 })
  }

  const scheduledPost = await ScheduledPost.create({
    userId: session.user.id,
    generatedPostId: post._id,
    content: post.content,
    hashtags: post.hashtags,
    postType: post.postType,
    mediaAssetIds: post.mediaAssetIds,
    externalUrl: post.externalUrl,
    scheduledFor: new Date(parsed.data.scheduledFor),
    timezone: parsed.data.timezone,
    status: 'pending',
  })

  // Queue delayed job
  const scheduledPublishQueue = getQueue(QUEUES.SCHEDULED_PUBLISH)
  const delay = new Date(parsed.data.scheduledFor).getTime() - Date.now()

  const job = await scheduledPublishQueue.add(
    'scheduled-publish',
    { scheduledPostId: scheduledPost._id.toString(), userId: session.user.id },
    { delay: Math.max(0, delay) }
  )

  await ScheduledPost.findByIdAndUpdate(scheduledPost._id, { jobId: job.id })
  await GeneratedPost.findByIdAndUpdate(id, { status: 'scheduled' })

  return NextResponse.json({ success: true, scheduledPostId: scheduledPost._id, jobId: job.id })
}

// DELETE /api/posts/[id] — delete a draft post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const post = await GeneratedPost.findOneAndDelete({
    _id: id,
    userId: session.user.id,
    status: { $in: ['draft', 'rejected'] },
  })

  if (!post) return NextResponse.json({ error: 'Not found or cannot delete' }, { status: 404 })

  return NextResponse.json({ success: true })
}
