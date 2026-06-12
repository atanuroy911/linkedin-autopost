import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { AIProviderSettings } from '@/lib/db/models/AIProviderSettings'
import { createAIProvider } from '@/lib/ai'
import { safeDecrypt } from '@/lib/encryption'
import type { AIProviderConfig } from '@/lib/ai'
import type { AIProvider } from '@/types'

export interface ContentIdea {
  title: string
  angle: string
  hook: string
  tags: string[]
}

/**
 * POST /api/content/discover
 * Accepts pasted text/notes and returns 6 AI-generated content ideas.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const body = await req.json()
  const { sourceContent } = body as { sourceContent: string }

  if (!sourceContent?.trim()) {
    return NextResponse.json({ error: 'sourceContent is required' }, { status: 400 })
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

  const prompt = `You are an expert LinkedIn content strategist for professionals and founders.

Analyse the following content that the user has provided:

---
${sourceContent.slice(0, 6000)}
---

Extract the core themes, expertise areas, and insights from this content. Then generate exactly 6 distinct, compelling LinkedIn post ideas a professional could write.

Return ONLY a valid JSON array — no markdown fences, no preamble, no extra text:
[
  {
    "title": "Short post concept (5-8 words)",
    "angle": "Unique perspective or argument of this post (max 20 words)",
    "hook": "Opening sentence that grabs attention (max 15 words)",
    "tags": ["keyword1", "keyword2", "keyword3"]
  }
]

Make each idea distinct. Cover a mix of: personal insight, how-to tip, contrarian take, behind-the-scenes, lessons learned, industry observation.`

  try {
    const raw = await aiClient.chat([{ role: 'user', content: prompt }])

    const cleaned = raw
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    const ideas: ContentIdea[] = JSON.parse(cleaned)

    if (!Array.isArray(ideas) || ideas.length === 0) {
      throw new Error('AI returned empty ideas array')
    }

    // Sanitise so no null/undefined fields ever reach the client
    const safe = ideas.map((idea) => ({
      title: idea.title || 'Untitled idea',
      angle: idea.angle || '',
      hook: idea.hook || '',
      tags: Array.isArray(idea.tags) ? idea.tags : [],
    }))

    return NextResponse.json({ success: true, ideas: safe })
  } catch (err: unknown) {
    console.error('[content/discover] Error:', (err as Error).message)
    return NextResponse.json(
      { error: 'Could not generate ideas. Check that your AI provider is configured and try again.' },
      { status: 500 }
    )
  }
}
