import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { GeneratedPost } from '@/lib/db/models/GeneratedPost'
import { AIProviderSettings } from '@/lib/db/models/AIProviderSettings'
import { z } from 'zod'

const draftSchema = z.object({
  content: z.string().min(1),
  hashtags: z.array(z.string()).optional().default([]),
})

/**
 * POST /api/posts/draft
 * Saves pre-written content directly as a draft — no AI generation queue.
 * Used by "I Read" and similar flows where the AI has already produced the content.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = draftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  // Use the active AI provider name for attribution (or 'manual' if none)
  const settings = await AIProviderSettings.findOne({ userId: session.user.id, isActive: true })

  const post = await GeneratedPost.create({
    userId: session.user.id,
    content: parsed.data.content,
    hashtags: parsed.data.hashtags,
    aiProvider: settings?.provider || 'openai',
    modelUsed: settings?.defaultModel || 'manual',
    postType: 'text',
    status: 'draft',
    generatedAt: new Date(),
  })

  return NextResponse.json({ success: true, postId: post._id })
}
