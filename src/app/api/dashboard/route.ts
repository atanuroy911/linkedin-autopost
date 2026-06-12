import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { GeneratedPost } from '@/lib/db/models/GeneratedPost'
import { PublishedPost } from '@/lib/db/models/PublishedPost'
import { ScheduledPost } from '@/lib/db/models/ScheduledPost'
import { LinkedInAccount } from '@/lib/db/models/LinkedInAccount'
import { AIProviderSettings } from '@/lib/db/models/AIProviderSettings'
import { Notification } from '@/lib/db/models/Notification'

// GET /api/dashboard — user dashboard summary data
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  await connectDB()

  const [
    linkedInAccount,
    aiSettings,
    draftCount,
    pendingApprovalCount,
    scheduledCount,
    publishedCount,
    unreadNotifications,
    recentDrafts,
    recentPublished,
  ] = await Promise.all([
    LinkedInAccount.findOne({ userId, isConnected: true }).lean(),
    AIProviderSettings.findOne({ userId, isActive: true }).select('-apiKey').lean(),
    GeneratedPost.countDocuments({ userId, status: 'draft' }),
    GeneratedPost.countDocuments({ userId, status: 'pending_approval' }),
    ScheduledPost.countDocuments({ userId, status: 'pending' }),
    PublishedPost.countDocuments({ userId }),
    Notification.countDocuments({ userId, isRead: false }),
    GeneratedPost.find({ userId, status: { $in: ['draft', 'pending_approval'] } })
      .sort({ generatedAt: -1 })
      .limit(5)
      .lean(),
    PublishedPost.find({ userId }).sort({ publishedAt: -1 }).limit(5).lean(),
  ])

  return NextResponse.json({
    linkedin: linkedInAccount
      ? {
          connected: true,
          displayName: (linkedInAccount as { displayName: string }).displayName,
          avatar: (linkedInAccount as { avatar?: string }).avatar,
          tokenExpiresAt: (linkedInAccount as { tokenExpiresAt: Date }).tokenExpiresAt,
        }
      : { connected: false },
    ai: aiSettings
      ? {
          configured: true,
          provider: (aiSettings as { provider: string }).provider,
          model: (aiSettings as { defaultModel: string }).defaultModel,
          testStatus: (aiSettings as { testStatus?: string }).testStatus,
        }
      : { configured: false },
    stats: { draftCount, pendingApprovalCount, scheduledCount, publishedCount, unreadNotifications },
    recentDrafts,
    recentPublished,
  })
}
