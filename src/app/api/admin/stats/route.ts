import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { User } from '@/lib/db/models/User'
import { GeneratedPost } from '@/lib/db/models/GeneratedPost'
import { PublishedPost } from '@/lib/db/models/PublishedPost'
import { LinkedInAccount } from '@/lib/db/models/LinkedInAccount'

function isAdmin(session: { user?: { role?: string } } | null) {
  return session?.user?.role === 'admin'
}

// GET /api/admin/stats — admin dashboard stats
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const [
    totalUsers,
    activeUsers,
    totalPosts,
    totalPublished,
    connectedLinkedIn,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    GeneratedPost.countDocuments(),
    PublishedPost.countDocuments(),
    LinkedInAccount.countDocuments({ isConnected: true }),
  ])

  return NextResponse.json({
    totalUsers,
    activeUsers,
    totalPosts,
    totalPublished,
    connectedLinkedIn,
  })
}
