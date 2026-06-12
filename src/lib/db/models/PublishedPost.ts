import { Schema, model, models, Document } from 'mongoose'
import { IPublishedPost } from '@/types'

export interface PublishedPostDocument extends Omit<IPublishedPost, '_id'>, Document {
  deletedOnLinkedIn?: boolean
}

const PublishedPostSchema = new Schema<PublishedPostDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    generatedPostId: { type: Schema.Types.ObjectId, ref: 'GeneratedPost' },
    scheduledPostId: { type: Schema.Types.ObjectId, ref: 'ScheduledPost' },
    linkedinPostId: { type: String, required: true },
    linkedinPostUrl: { type: String },
    content: { type: String, required: true },
    hashtags: [{ type: String }],
    postType: {
      type: String,
      enum: ['text', 'image', 'video', 'link', 'document'],
      default: 'text',
    },
    mediaAssetIds: [{ type: Schema.Types.ObjectId, ref: 'MediaAsset' }],
    externalUrl: { type: String },
    publishedAt: { type: Date, default: Date.now },
    publishMethod: { type: String, enum: ['manual', 'scheduled', 'auto'], required: true },
    deletedOnLinkedIn: { type: Boolean, default: false },
  },
  { timestamps: true }
)

PublishedPostSchema.index({ userId: 1, publishedAt: -1 })

export const PublishedPost =
  models.PublishedPost || model<PublishedPostDocument>('PublishedPost', PublishedPostSchema)
