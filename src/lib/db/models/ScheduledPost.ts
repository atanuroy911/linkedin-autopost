import { Schema, model, models, Document } from 'mongoose'
import { IScheduledPost } from '@/types'

export interface ScheduledPostDocument extends Omit<IScheduledPost, '_id'>, Document {}

const ScheduledPostSchema = new Schema<ScheduledPostDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    generatedPostId: { type: Schema.Types.ObjectId, ref: 'GeneratedPost', required: true },
    content: { type: String, required: true },
    hashtags: [{ type: String }],
    postType: {
      type: String,
      enum: ['text', 'image', 'video', 'link', 'document'],
      default: 'text',
    },
    mediaAssetIds: [{ type: Schema.Types.ObjectId, ref: 'MediaAsset' }],
    externalUrl: { type: String },
    scheduledFor: { type: Date, required: true },
    timezone: { type: String, default: 'UTC' },
    jobId: { type: String },
    status: {
      type: String,
      enum: ['pending', 'processing', 'published', 'failed', 'cancelled'],
      default: 'pending',
    },
    errorMessage: { type: String },
  },
  { timestamps: true }
)

ScheduledPostSchema.index({ userId: 1, scheduledFor: 1 })
ScheduledPostSchema.index({ userId: 1, status: 1 })
ScheduledPostSchema.index({ scheduledFor: 1, status: 1 })

export const ScheduledPost =
  models.ScheduledPost || model<ScheduledPostDocument>('ScheduledPost', ScheduledPostSchema)
