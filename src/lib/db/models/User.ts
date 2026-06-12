import mongoose, { Schema, model, models, Document } from 'mongoose'
import { IUser } from '@/types'

export interface UserDocument extends Omit<IUser, '_id'>, Document {}

const UserSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    avatar: { type: String },
    settings: {
      autoPublish: { type: Boolean, default: false },
      autoPublishDelayHours: { type: Number, default: 24 },
      emailNotifications: { type: Boolean, default: true },
      inAppNotifications: { type: Boolean, default: true },
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
)

UserSchema.index({ email: 1 })
UserSchema.index({ role: 1 })

// Remove passwordHash from JSON output
UserSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.passwordHash
  return obj
}

export const User = models.User || model<UserDocument>('User', UserSchema)
