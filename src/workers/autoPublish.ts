import { Worker, Job } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'
import connectDB from '@/lib/db/connection'
import { GeneratedPost } from '@/lib/db/models/GeneratedPost'
import { LinkedInAccount } from '@/lib/db/models/LinkedInAccount'
import { PublishedPost } from '@/lib/db/models/PublishedPost'
import { ScheduledPost } from '@/lib/db/models/ScheduledPost'
import { getQueue, getRedisConnection, QUEUES } from './queues'
import { publishToLinkedIn } from '@/lib/linkedin/publish'
import type { AutoPublishJobData, ScheduledPublishJobData } from './queues'

export function createAutoPublishWorker() {
  const worker = new Worker<AutoPublishJobData>(
    QUEUES.AUTO_PUBLISH,
    async (job: Job<AutoPublishJobData>) => {
      const { generatedPostId, userId } = job.data

      await connectDB()

      const post = await GeneratedPost.findOne({
        _id: generatedPostId,
        userId,
        status: 'draft',
      })

      if (!post) {
        console.log(`Auto-publish: post ${generatedPostId} no longer in draft state, skipping.`)
        return
      }

      const linkedInAccount = await LinkedInAccount.findOne({ userId, isConnected: true })
      if (!linkedInAccount) {
        throw new Error(`No connected LinkedIn account for user ${userId}`)
      }

      const result = await publishToLinkedIn({
        encryptedAccessToken: linkedInAccount.accessToken,
        linkedinUserId: linkedInAccount.linkedinId,
        content: `${post.content}\n\n${post.hashtags.map((h: string) => `#${h}`).join(' ')}`,
        postType: post.postType,
      })

      await PublishedPost.create({
        userId,
        generatedPostId: post._id,
        linkedinPostId: result.postId,
        linkedinPostUrl: result.postUrl,
        content: post.content,
        hashtags: post.hashtags,
        postType: post.postType,
        mediaAssetIds: post.mediaAssetIds,
        externalUrl: post.externalUrl,
        publishedAt: new Date(),
        publishMethod: 'auto',
      })

      await GeneratedPost.findByIdAndUpdate(generatedPostId, {
        status: 'published',
        approvedAt: new Date(),
      })

      const notificationQueue = getQueue(QUEUES.NOTIFICATION)
      await notificationQueue.add('post-auto-published', {
        userId,
        type: 'post_published',
        title: 'Post auto-published to LinkedIn',
        message: `A post has been automatically published to your LinkedIn profile. View it at: ${result.postUrl}`,
        data: { postUrl: result.postUrl, linkedinPostId: result.postId },
        sendEmail: true,
      })

      console.log(`✅ Auto-published post ${generatedPostId} for user ${userId}`)
    },
    { connection: getRedisConnection() as unknown as ConnectionOptions }
  )

  worker.on('failed', (job, err) => {
    console.error(`❌ Auto-publish job ${job?.id} failed:`, err.message)
  })

  return worker
}

export function createScheduledPublishWorker() {
  const worker = new Worker<ScheduledPublishJobData>(
    QUEUES.SCHEDULED_PUBLISH,
    async (job: Job<ScheduledPublishJobData>) => {
      const { scheduledPostId, userId } = job.data

      await connectDB()

      const scheduledPost = await ScheduledPost.findOne({ _id: scheduledPostId, userId, status: 'pending' })
      if (!scheduledPost) return

      await ScheduledPost.findByIdAndUpdate(scheduledPostId, { status: 'processing' })

      const linkedInAccount = await LinkedInAccount.findOne({ userId, isConnected: true })
      if (!linkedInAccount) throw new Error('No LinkedIn account connected')

      const result = await publishToLinkedIn({
        encryptedAccessToken: linkedInAccount.accessToken,
        linkedinUserId: linkedInAccount.linkedinId,
        content: `${scheduledPost.content}\n\n${scheduledPost.hashtags.map((h: string) => `#${h}`).join(' ')}`,
        postType: scheduledPost.postType,
      })

      await PublishedPost.create({
        userId,
        generatedPostId: scheduledPost.generatedPostId,
        scheduledPostId: scheduledPost._id,
        linkedinPostId: result.postId,
        linkedinPostUrl: result.postUrl,
        content: scheduledPost.content,
        hashtags: scheduledPost.hashtags,
        postType: scheduledPost.postType,
        mediaAssetIds: scheduledPost.mediaAssetIds,
        externalUrl: scheduledPost.externalUrl,
        publishedAt: new Date(),
        publishMethod: 'scheduled',
      })

      await ScheduledPost.findByIdAndUpdate(scheduledPostId, { status: 'published' })
      await GeneratedPost.findByIdAndUpdate(scheduledPost.generatedPostId, { status: 'published' })

      const notificationQueue = getQueue(QUEUES.NOTIFICATION)
      await notificationQueue.add('post-scheduled-published', {
        userId,
        type: 'post_published',
        title: 'Scheduled post published',
        message: `Your scheduled post has been published to LinkedIn. View it at: ${result.postUrl}`,
        data: { postUrl: result.postUrl },
        sendEmail: false,
      })
    },
    { connection: getRedisConnection() as unknown as ConnectionOptions }
  )

  worker.on('failed', async (job, err) => {
    if (job?.data.scheduledPostId) {
      await connectDB()
      await ScheduledPost.findByIdAndUpdate(job.data.scheduledPostId, {
        status: 'failed',
        errorMessage: err.message,
      })
    }
  })

  return worker
}
