import { Queue, Worker, QueueEvents } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'
import IORedis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

// Singleton connection for BullMQ
let connection: IORedis | null = null

export function getRedisConnection(): IORedis {
  if (connection) return connection
  connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  })
  return connection
}

// Queue names
export const QUEUES = {
  TOPIC_GENERATION: 'topic-generation',
  CONTENT_GENERATION: 'content-generation',
  AUTO_PUBLISH: 'auto-publish',
  NOTIFICATION: 'notification',
  TOKEN_REFRESH: 'token-refresh',
  SCHEDULED_PUBLISH: 'scheduled-publish',
  CAMPAIGN_RUNNER: 'campaign-runner',
} as const

type QueueName = (typeof QUEUES)[keyof typeof QUEUES]

// Queue instances cache
const queues: Map<string, Queue> = new Map()

export function getQueue(name: QueueName): Queue {
  if (queues.has(name)) return queues.get(name)!

  const queue = new Queue(name, {
    connection: getRedisConnection() as unknown as ConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  })
  queues.set(name, queue)
  return queue
}

// Type-safe job data interfaces
export interface ContentGenerationJobData {
  userId: string
  topicId?: string
  topic: string
  industry?: string
  keywords?: string[]
  contentPillars?: string[]
  count?: number
}

export interface NotificationJobData {
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
  sendEmail?: boolean
}

export interface AutoPublishJobData {
  generatedPostId: string
  userId: string
}

export interface ScheduledPublishJobData {
  scheduledPostId: string
  userId: string
}

export interface TokenRefreshJobData {
  userId: string
  linkedinAccountId: string
}

export interface CampaignRunnerJobData {
  campaignId: string
}
