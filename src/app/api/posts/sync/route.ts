import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { PublishedPost } from '@/lib/db/models/PublishedPost'
import { LinkedInAccount } from '@/lib/db/models/LinkedInAccount'
import { checkPostExists } from '@/lib/linkedin/publish'

// POST /api/posts/sync — sync published posts status with LinkedIn
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const linkedInAccount = await LinkedInAccount.findOne({ userId: session.user.id, isConnected: true })
  if (!linkedInAccount) {
    return NextResponse.json({ error: 'No LinkedIn account connected' }, { status: 400 })
  }

  // Get up to 50 most recent published posts
  const recentPosts = await PublishedPost.find({ 
    userId: session.user.id,
    deletedOnLinkedIn: { $ne: true } 
  }).sort({ publishedAt: -1 }).limit(50)

  let deletedCount = 0

  for (const post of recentPosts) {
    if (!post.linkedinPostId) continue
    
    // To prevent rate limiting, add a small delay
    await new Promise((resolve) => setTimeout(resolve, 300))
    
    const exists = await checkPostExists(linkedInAccount.accessToken, post.linkedinPostId)
    if (!exists) {
      await PublishedPost.findByIdAndUpdate(post._id, { deletedOnLinkedIn: true })
      deletedCount++
    }
  }

  return NextResponse.json({ success: true, deletedCount })
}
