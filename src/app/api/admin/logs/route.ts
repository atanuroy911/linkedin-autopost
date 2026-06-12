import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { ActivityLog } from '@/lib/db/models/ActivityLog'
import { User } from '@/lib/db/models/User'
import { GeneratedPost } from '@/lib/db/models/GeneratedPost'
import { PublishedPost } from '@/lib/db/models/PublishedPost'
import { UserPreferences } from '@/lib/db/models/UserPreferences'

async function canViewLogs(session: { user?: { id?: string, role?: string } } | null) {
  if (session?.user?.role === 'admin') return true
  if (!session?.user?.id) return false
  
  await connectDB()
  const prefs = await UserPreferences.findOne({ userId: session.user.id })
  return prefs?.developerMode === true
}

// GET /api/admin/logs — list activity logs
export async function GET(req: NextRequest) {
  const session = await auth()
  const allowed = await canViewLogs(session)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '50')
  const userId = searchParams.get('userId')
  const action = searchParams.get('action')

  await connectDB()

  const query: Record<string, unknown> = {}
  if (userId) query.userId = userId
  if (action) query.action = { $regex: action, $options: 'i' }

  const [items, total] = await Promise.all([
    ActivityLog.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    ActivityLog.countDocuments(query),
  ])

  return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}
