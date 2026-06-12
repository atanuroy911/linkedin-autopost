import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { UserPreferences } from '@/lib/db/models/UserPreferences'
import { getQueue, QUEUES } from '@/workers/queues'

async function canViewDeveloper(session: { user?: { id?: string, role?: string } } | null) {
  if (session?.user?.role === 'admin') return true
  if (!session?.user?.id) return false
  
  await connectDB()
  const prefs = await UserPreferences.findOne({ userId: session.user.id })
  return prefs?.developerMode === true
}

export async function GET(req: NextRequest) {
  const session = await auth()
  const allowed = await canViewDeveloper(session)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const queueData = await Promise.all(
    Object.values(QUEUES).map(async (queueName) => {
      const q = getQueue(queueName)
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        q.getWaitingCount(),
        q.getActiveCount(),
        q.getCompletedCount(),
        q.getFailedCount(),
        q.getDelayedCount(),
        q.isPaused(),
      ])

      const recentJobs = await q.getJobs(['active', 'waiting', 'delayed', 'failed'], 0, 5, true)
      
      return {
        name: queueName,
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
        jobs: recentJobs.map(j => ({
          id: j.id,
          name: j.name,
          data: j.data,
          status: j.finishedOn ? (j.failedReason ? 'failed' : 'completed') : (j.processedOn ? 'active' : (j.delay ? 'delayed' : 'waiting')),
          failedReason: j.failedReason,
          timestamp: j.timestamp
        }))
      }
    })
  )

  return NextResponse.json({ queues: queueData })
}
