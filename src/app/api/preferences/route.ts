import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { UserPreferences } from '@/lib/db/models/UserPreferences'
import { z } from 'zod'

// GET /api/preferences — get user preferences
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  let prefs = await UserPreferences.findOne({ userId: session.user.id })
  
  if (!prefs) {
    prefs = await UserPreferences.create({ userId: session.user.id })
  }

  return NextResponse.json(prefs)
}

const preferencesSchema = z.object({
  autoPublish: z.boolean().optional(),
  developerMode: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
})

// PUT /api/preferences — update user preferences
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = preferencesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const prefs = await UserPreferences.findOneAndUpdate(
    { userId: session.user.id },
    { $set: parsed.data },
    { upsert: true, new: true }
  )

  return NextResponse.json(prefs)
}
