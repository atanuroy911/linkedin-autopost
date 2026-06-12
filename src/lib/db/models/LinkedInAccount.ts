import { Schema, model, models, Document, Types } from 'mongoose'
import { ILinkedInAccount } from '@/types'

export interface LinkedInAccountDocument extends Omit<ILinkedInAccount, '_id'>, Document {}

const LinkedInAccountSchema = new Schema<LinkedInAccountDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    linkedinId: { type: String, required: true },
    profileUrl: { type: String, required: true },
    displayName: { type: String, required: true },
    avatar: { type: String },
    accessToken: { type: String, required: true }, // AES-256 encrypted
    refreshToken: { type: String }, // AES-256 encrypted
    tokenExpiresAt: { type: Date, required: true },
    scope: { type: String, required: true },
    isConnected: { type: Boolean, default: true },
    connectedAt: { type: Date, default: Date.now },
    disconnectedAt: { type: Date },
  },
  { timestamps: true }
)

LinkedInAccountSchema.index({ userId: 1 })
LinkedInAccountSchema.index({ tokenExpiresAt: 1 })

export const LinkedInAccount =
  models.LinkedInAccount || model<LinkedInAccountDocument>('LinkedInAccount', LinkedInAccountSchema)
