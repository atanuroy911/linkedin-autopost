import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { AIProviderSettings } from '@/lib/db/models/AIProviderSettings'
import { createAIProvider } from '@/lib/ai'
import { safeDecrypt } from '@/lib/encryption'
import type { AIProviderConfig } from '@/lib/ai'
import type { AIProvider } from '@/types'

export interface IReadPost {
  angle: string
  angleLabel: string
  summary: string
  content: string
  hashtags: string[]
}

/**
 * POST /api/content/iread
 * Takes pasted article/paper text, extracts a summary, then generates 3
 * complete LinkedIn posts from 3 distinct "I just read this" angles.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const body = await req.json()
  const { content, tone } = body as { content: string; tone?: string }

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Article content is required' }, { status: 400 })
  }

  const settings = await AIProviderSettings.findOne({ userId: session.user.id, isActive: true })
  if (!settings) {
    return NextResponse.json(
      { error: 'No AI provider configured. Please set one up in Settings.' },
      { status: 400 }
    )
  }

  const config: AIProviderConfig = {
    apiKey: settings.apiKey ? (safeDecrypt(settings.apiKey) ?? undefined) : undefined,
    ollamaEndpoint: settings.ollamaEndpoint,
    defaultModel: settings.defaultModel,
    generationSettings: settings.generationSettings,
  }

  const aiClient = createAIProvider(settings.provider as AIProvider, config)

  const toneNote = tone ? `Write in a ${tone.toLowerCase()} tone.` : 'Write in a professional, authentic tone.'

  const prompt = `You are a professional writing LinkedIn posts. You have just read the following article or paper:

---
${content.slice(0, 6000)}
---

${toneNote}

Write 3 complete, ready-to-publish LinkedIn posts — each from a uniquely different angle as if you personally just read this content and want to share what you learned. Each post must:
- Start naturally (e.g. "I just read...", "Just finished reading...", "This paper changed my thinking on...", "Been sitting with this article...")
- Share a genuine takeaway, insight, or reaction
- Be 150–280 words (optimal LinkedIn length)
- Feel personal and authentic, not like a summary press release
- End with an engaging question or call-to-action
- Include 3–5 relevant hashtags at the end

Return ONLY a valid JSON array — no markdown fences, no preamble:
[
  {
    "angle": "key_insight",
    "angleLabel": "Key Insight",
    "summary": "One sentence describing the angle of this post (max 15 words)",
    "content": "Full LinkedIn post text...",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
  },
  {
    "angle": "practical_application",
    "angleLabel": "Practical Application",
    "summary": "...",
    "content": "...",
    "hashtags": [...]
  },
  {
    "angle": "nuanced_take",
    "angleLabel": "My Nuanced Take",
    "summary": "...",
    "content": "...",
    "hashtags": [...]
  }
]`

  try {
    const raw = await aiClient.chat([{ role: 'user', content: prompt }])

    const cleaned = raw
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    const posts: IReadPost[] = JSON.parse(cleaned)

    if (!Array.isArray(posts) || posts.length === 0) {
      throw new Error('AI returned empty posts array')
    }

    // Sanitise fields
    const safe = posts.map((p) => ({
      angle: p.angle || 'insight',
      angleLabel: p.angleLabel || 'Insight',
      summary: p.summary || '',
      content: p.content || '',
      hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
    }))

    return NextResponse.json({ success: true, posts: safe })
  } catch (err: unknown) {
    console.error('[content/iread] Error:', (err as Error).message)
    return NextResponse.json(
      { error: 'Could not generate posts. Check your AI provider configuration and try again.' },
      { status: 500 }
    )
  }
}
