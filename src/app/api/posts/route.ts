import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { GeneratedPost } from '@/lib/db/models/GeneratedPost'
import { PublishedPost } from '@/lib/db/models/PublishedPost'
import { getQueue, QUEUES } from '@/workers/queues'
import { z } from 'zod'
import type { PostStatus } from '@/types'

// GET /api/posts — list user's generated posts with filters
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as PostStatus | null
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  await connectDB()

  if (status === 'published') {
    const query = { userId: session.user.id, deletedOnLinkedIn: { $ne: true } }
    const [items, total] = await Promise.all([
      PublishedPost.find(query)
        .populate('mediaAssetIds')
        .sort({ publishedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      PublishedPost.countDocuments(query),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  }

  const query: Record<string, unknown> = { userId: session.user.id }
  if (status) {
    query.status = status
  }

  const [items, total] = await Promise.all([
    GeneratedPost.find(query)
      .populate('mediaAssetIds')
      .sort({ generatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    GeneratedPost.countDocuments(query),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

const generateSchema = z.object({
  topic: z.string().min(3),
  industry: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  contentPillars: z.array(z.string()).optional(),
  topicId: z.string().optional(),
  count: z.number().min(1).max(10).default(3),
  tone: z.string().optional(),
  additionalInstructions: z.string().optional(),
})

// POST /api/posts/generate — trigger AI content generation
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const queue = getQueue(QUEUES.CONTENT_GENERATION)
  const job = await queue.add('generate-content', {
    userId: session.user.id,
    ...parsed.data,
  })

  return NextResponse.json({
    success: true,
    message: 'Content generation queued',
    jobId: job.id,
  })
}
