import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { Notification } from '@/lib/db/models/Notification'

// GET /api/notifications — get user's notifications
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unread') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  await connectDB()

  const query: Record<string, unknown> = { userId: session.user.id }
  if (unreadOnly) query.isRead = false

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: session.user.id, isRead: false }),
  ])

  return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize), unreadCount })
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { ids } = body as { ids?: string[] }

  await connectDB()

  if (ids?.length) {
    await Notification.updateMany(
      { _id: { $in: ids }, userId: session.user.id },
      { isRead: true, readAt: new Date() }
    )
  } else {
    await Notification.updateMany(
      { userId: session.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    )
  }

  return NextResponse.json({ success: true })
}
