import { Schema, model, models, Document } from 'mongoose'
import { IGeneratedPost } from '@/types'

export interface GeneratedPostDocument extends Omit<IGeneratedPost, '_id'>, Document {}

const GeneratedPostSchema = new Schema<GeneratedPostDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic' },
    aiProvider: {
      type: String,
      enum: ['openai', 'claude', 'gemini', 'ollama', 'openrouter'],
      required: true,
    },
    modelUsed: { type: String, required: true },
    content: { type: String, required: true },
    hashtags: [{ type: String }],
    postType: {
      type: String,
      enum: ['text', 'image', 'video', 'link', 'document'],
      default: 'text',
    },
    mediaAssetIds: [{ type: Schema.Types.ObjectId, ref: 'MediaAsset' }],
    externalUrl: { type: String },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'scheduled', 'published', 'rejected'],
      default: 'draft',
    },
    rating: { type: Number, min: 1, max: 5 },
    rejectionReason: { type: String },
    generatedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    autoPublishDeadline: { type: Date },
  },
  { timestamps: true }
)

GeneratedPostSchema.index({ userId: 1, status: 1 })
GeneratedPostSchema.index({ userId: 1, generatedAt: -1 })
GeneratedPostSchema.index({ autoPublishDeadline: 1 })

export const GeneratedPost =
  models.GeneratedPost || model<GeneratedPostDocument>('GeneratedPost', GeneratedPostSchema)
