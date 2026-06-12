import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { AIProviderSettings } from '@/lib/db/models/AIProviderSettings'
import { createAIProvider } from '@/lib/ai'
import { safeDecrypt } from '@/lib/encryption'
import type { AIProviderConfig } from '@/lib/ai'
import type { AIProvider } from '@/types'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { provider, apiKey, ollamaEndpoint } = body as { provider: AIProvider, apiKey?: string, ollamaEndpoint?: string }

    let actualApiKey = apiKey

    // If the client sends ***masked***, fetch the real key from DB
    if (apiKey === '***masked***') {
      await connectDB()
      const settings = await AIProviderSettings.findOne({ userId: session.user.id, isActive: true })
      if (settings?.apiKey) {
        actualApiKey = safeDecrypt(settings.apiKey) || undefined
      } else {
        actualApiKey = undefined
      }
    }

    const config: AIProviderConfig = {
      apiKey: actualApiKey,
      ollamaEndpoint: ollamaEndpoint || 'http://localhost:11434',
      defaultModel: '',
      generationSettings: { temperature: 0.7, maxTokens: 1024, topP: 1.0 },
    }

    const aiClient = createAIProvider(provider, config)
    const models = await aiClient.listModels()

    return NextResponse.json({ success: true, models })
  } catch (err: unknown) {
    console.error('Error fetching models:', err)
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
}
