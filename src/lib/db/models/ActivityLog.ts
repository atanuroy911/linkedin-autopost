import { Schema, model, models, Document } from 'mongoose'
import { IActivityLog } from '@/types'

export interface ActivityLogDocument extends Omit<IActivityLog, '_id'>, Document {}

const ActivityLogSchema = new Schema<ActivityLogDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
)

ActivityLogSchema.index({ userId: 1, createdAt: -1 })
ActivityLogSchema.index({ resourceType: 1, createdAt: -1 })
ActivityLogSchema.index({ createdAt: -1 })

export const ActivityLog =
  models.ActivityLog || model<ActivityLogDocument>('ActivityLog', ActivityLogSchema)
