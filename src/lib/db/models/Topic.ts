import { Schema, model, models, Document } from 'mongoose'
import { ITopic } from '@/types'

export interface TopicDocument extends Omit<ITopic, '_id'>, Document {}

const TopicSchema = new Schema<TopicDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    industry: { type: String, required: true, trim: true },
    topics: [{ type: String, trim: true }],
    keywords: [{ type: String, trim: true }],
    contentPillars: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

TopicSchema.index({ userId: 1 })
TopicSchema.index({ userId: 1, isActive: 1 })

export const Topic = models.Topic || model<TopicDocument>('Topic', TopicSchema)
