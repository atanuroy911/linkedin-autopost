import { Worker, Job } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'
import connectDB from '@/lib/db/connection'
import { LinkedInAccount } from '@/lib/db/models/LinkedInAccount'
import { refreshAccessToken, encryptToken } from '@/lib/linkedin/oauth'
import { getQueue, getRedisConnection, QUEUES } from './queues'
import { addSeconds, subHours, isBefore } from 'date-fns'
import type { TokenRefreshJobData } from './queues'

export function createTokenRefreshWorker() {
  const worker = new Worker<TokenRefreshJobData>(
    QUEUES.TOKEN_REFRESH,
    async (job: Job<TokenRefreshJobData>) => {
      const { userId, linkedinAccountId } = job.data

      await connectDB()

      const account = await LinkedInAccount.findOne({ _id: linkedinAccountId, userId })
      if (!account || !account.isConnected) return

      // Refresh if token expires within 7 days
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      if (account.tokenExpiresAt > sevenDaysFromNow) {
        console.log(`Token for user ${userId} not yet near expiry, skipping refresh.`)
        return
      }

      if (!account.refreshToken) {
        // No refresh token — notify user to reconnect
        const notificationQueue = getQueue(QUEUES.NOTIFICATION)
        await notificationQueue.add('linkedin-expired', {
          userId,
          type: 'linkedin_expired',
          title: 'LinkedIn authorization expired',
          message: 'Your LinkedIn authorization has expired. Please reconnect your LinkedIn account to continue publishing.',
          sendEmail: true,
        })
        return
      }

      try {
        const { accessToken, expiresIn } = await refreshAccessToken(account.refreshToken)

        await LinkedInAccount.findByIdAndUpdate(linkedinAccountId, {
          accessToken: encryptToken(accessToken),
          tokenExpiresAt: addSeconds(new Date(), expiresIn),
        })

        console.log(`✅ Refreshed LinkedIn token for user ${userId}`)
      } catch (err: unknown) {
        console.error(`Failed to refresh token for user ${userId}:`, (err as Error).message)

        const notificationQueue = getQueue(QUEUES.NOTIFICATION)
        await notificationQueue.add('linkedin-token-refresh-failed', {
          userId,
          type: 'linkedin_expired',
          title: 'LinkedIn token refresh failed',
          message: 'We were unable to refresh your LinkedIn authorization. Please reconnect your LinkedIn account.',
          sendEmail: true,
        })
      }
    },
    { connection: getRedisConnection() as unknown as ConnectionOptions }
  )

  return worker
}
