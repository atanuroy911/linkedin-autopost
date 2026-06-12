import mongoose, { Schema, Document, model, models } from 'mongoose'

export interface UserPreferencesDocument extends Document {
  userId: mongoose.Types.ObjectId
  autoPublish: boolean
  developerMode: boolean
  emailNotifications: boolean
  createdAt: Date
  updatedAt: Date
}

const UserPreferencesSchema = new Schema<UserPreferencesDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    autoPublish: { type: Boolean, default: false },
    developerMode: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const UserPreferences =
  models.UserPreferences || model<UserPreferencesDocument>('UserPreferences', UserPreferencesSchema)
