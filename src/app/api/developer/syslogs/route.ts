import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { UserPreferences } from '@/lib/db/models/UserPreferences'
import { getRedisConnection } from '@/workers/queues'

async function canViewDeveloper(session: { user?: { id?: string, role?: string } } | null) {
  if (session?.user?.role === 'admin') return true
  if (!session?.user?.id) return false
  
  await connectDB()
  const prefs = await UserPreferences.findOne({ userId: session.user.id })
  return prefs?.developerMode === true
}

export const dynamic = 'force-dynamic'

// GET /api/developer/syslogs — get terminal logs
export async function GET(req: NextRequest) {
  const session = await auth()
  const allowed = await canViewDeveloper(session)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const redis = getRedisConnection()
  
  // Fetch up to 1000 latest logs
  const rawLogs = await redis.lrange('system:terminal:logs', 0, 999)
  
  const logs = rawLogs.map(str => {
    try {
      return JSON.parse(str)
    } catch {
      return { level: 'info', msg: str, time: Date.now() }
    }
  })

  // Return chronologically (oldest to newest for terminal)
  return NextResponse.json({ logs: logs.reverse() })
}
