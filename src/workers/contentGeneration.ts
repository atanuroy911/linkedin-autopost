import { Worker, Job } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'
import connectDB from '@/lib/db/connection'
import { User } from '@/lib/db/models/User'
import { AIProviderSettings } from '@/lib/db/models/AIProviderSettings'
import { Topic } from '@/lib/db/models/Topic'
import { GeneratedPost } from '@/lib/db/models/GeneratedPost'
import { createAIProvider } from '@/lib/ai'
import { safeDecrypt } from '@/lib/encryption'
import { getQueue, getRedisConnection, QUEUES } from './queues'
import type { ContentGenerationJobData } from './queues'
import type { AIProviderConfig } from '@/lib/ai'
import { addHours } from 'date-fns'

export function createContentGenerationWorker() {
  const worker = new Worker<ContentGenerationJobData>(
    QUEUES.CONTENT_GENERATION,
    async (job: Job<ContentGenerationJobData>) => {
      const { userId, topic, industry, keywords, contentPillars, count, topicId } = job.data

      await connectDB()

      // Get user's AI provider settings
      const settings = await AIProviderSettings.findOne({ userId, isActive: true })
      if (!settings) {
        throw new Error(`No active AI provider settings for user ${userId}`)
      }

      // Decrypt API key
      const apiKey = settings.apiKey ? safeDecrypt(settings.apiKey) || undefined : undefined

      const config: AIProviderConfig = {
        apiKey,
        ollamaEndpoint: settings.ollamaEndpoint,
        defaultModel: settings.defaultModel,
        generationSettings: settings.generationSettings,
      }

      const provider = createAIProvider(settings.provider, config)

      // Generate posts
      const posts = await provider.generatePosts({
        topic,
        industry,
        keywords,
        contentPillars,
        count: count || 3,
      })

      // Get user auto-publish settings
      const user = await User.findById(userId)
      const autoPublishDelay = user?.settings?.autoPublishDelayHours || 24

      // Save posts to DB
      const savedPosts = await Promise.all(
        posts.map(async (post) => {
          const generatedPost = new GeneratedPost({
            userId,
            topicId,
            aiProvider: settings.provider,
            modelUsed: settings.defaultModel,
            content: post.content,
            hashtags: post.hashtags,
            postType: post.postType || 'text',
            status: 'draft',
            generatedAt: new Date(),
            autoPublishDeadline: user?.settings?.autoPublish
              ? addHours(new Date(), autoPublishDelay)
              : undefined,
          })
          return generatedPost.save()
        })
      )

      // Queue notification
      const notificationQueue = getQueue(QUEUES.NOTIFICATION)
      await notificationQueue.add('new-drafts', {
        userId,
        type: 'draft_created',
        title: 'New content drafts ready',
        message: `${savedPosts.length} new LinkedIn post drafts have been generated for "${topic}". Review and approve them to publish.`,
        data: { postIds: savedPosts.map((p) => p._id.toString()), topic },
        sendEmail: true,
      })

      // If auto-publish enabled, queue auto-publish jobs
      if (user?.settings?.autoPublish) {
        const autoPublishQueue = getQueue(QUEUES.AUTO_PUBLISH)
        for (const post of savedPosts) {
          await autoPublishQueue.add(
            'auto-publish-check',
            { generatedPostId: post._id.toString(), userId },
            { delay: autoPublishDelay * 60 * 60 * 1000 }
          )
        }
      }

      console.log(`✅ Generated ${savedPosts.length} posts for user ${userId}`)
      return { postsGenerated: savedPosts.length }
    },
    {
      connection: getRedisConnection() as unknown as ConnectionOptions,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`❌ Content generation job ${job?.id} failed:`, err.message)
  })

  return worker
}
