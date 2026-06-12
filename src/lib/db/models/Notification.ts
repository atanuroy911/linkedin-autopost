import { Schema, model, models, Document } from 'mongoose'
import { INotification } from '@/types'

export interface NotificationDocument extends Omit<INotification, '_id'>, Document {}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'draft_created',
        'approval_required',
        'post_scheduled',
        'post_published',
        'linkedin_expired',
        'ai_generation_failed',
        'auto_publish_warning',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
)

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })

export const Notification =
  models.Notification || model<NotificationDocument>('Notification', NotificationSchema)
