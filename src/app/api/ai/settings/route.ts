import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { AIProviderSettings } from '@/lib/db/models/AIProviderSettings'
import { createAIProvider } from '@/lib/ai'
import { encrypt, safeDecrypt } from '@/lib/encryption'
import { z } from 'zod'
import type { AIProvider } from '@/types'
import type { AIProviderConfig } from '@/lib/ai'

// GET /api/ai/settings — get user's AI provider settings (without raw API keys)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const settings = await AIProviderSettings.findOne({ userId: session.user.id, isActive: true })

  if (!settings) return NextResponse.json(null)

  // Never expose the raw API key
  const safe = settings.toObject()
  if (safe.apiKey) safe.apiKey = '***masked***'

  return NextResponse.json(safe)
}

const settingsSchema = z.object({
  provider: z.enum(['openai', 'claude', 'gemini', 'ollama', 'openrouter']),
  apiKey: z.string().optional(),
  ollamaEndpoint: z.string().url().optional().or(z.literal('')),
  defaultModel: z.string().min(1),
  generationSettings: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(100).max(8000).default(1024),
    topP: z.number().min(0).max(1).default(1.0),
    systemPrompt: z.string().optional(),
  }).optional(),
})

// PUT /api/ai/settings — upsert AI provider settings
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const existing = await AIProviderSettings.findOne({ userId: session.user.id, isActive: true })

  const update: Record<string, unknown> = {
    provider: parsed.data.provider,
    defaultModel: parsed.data.defaultModel,
    ollamaEndpoint: parsed.data.ollamaEndpoint,
    generationSettings: parsed.data.generationSettings,
  }

  // Only encrypt and update apiKey if provided (not masked)
  if (parsed.data.apiKey && parsed.data.apiKey !== '***masked***') {
    update.apiKey = encrypt(parsed.data.apiKey)
  } else if (existing?.apiKey && parsed.data.apiKey === '***masked***') {
    // Keep existing key
    update.apiKey = existing.apiKey
  }

  const settings = await AIProviderSettings.findOneAndUpdate(
    { userId: session.user.id },
    { ...update, userId: session.user.id, isActive: true },
    { upsert: true, new: true }
  )

  const safe = settings.toObject()
  if (safe.apiKey) safe.apiKey = '***masked***'

  return NextResponse.json(safe)
}


