import { Worker, Job } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'
import connectDB from '@/lib/db/connection'
import { User } from '@/lib/db/models/User'
import { Notification } from '@/lib/db/models/Notification'
import { sendEmail, getEmailTemplate } from '@/lib/email/mailer'
import { getRedisConnection, QUEUES } from './queues'
import type { NotificationJobData } from './queues'
import type { NotificationType } from '@/types'

export function createNotificationWorker() {
  const worker = new Worker<NotificationJobData>(
    QUEUES.NOTIFICATION,
    async (job: Job<NotificationJobData>) => {
      const { userId, type, title, message, data, sendEmail: shouldSendEmail } = job.data

      await connectDB()

      // Save in-app notification
      await Notification.create({
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
      })

      // Send email if requested
      if (shouldSendEmail) {
        const user = await User.findById(userId)
        if (user?.settings?.emailNotifications && user.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const html = getEmailTemplate(type as NotificationType, {
            userName: user.name,
            title,
            message,
            actionUrl: `${appUrl}/dashboard`,
            actionLabel: 'Open Dashboard',
          })

          await sendEmail({ to: user.email, subject: title, html }).catch((err) => {
            console.error('Failed to send notification email:', err.message)
          })
        }
      }
    },
    { connection: getRedisConnection() as unknown as ConnectionOptions, concurrency: 10 }
  )

  return worker
}
