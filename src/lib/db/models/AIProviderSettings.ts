import { Schema, model, models, Document } from 'mongoose'
import { IAIProviderSettings } from '@/types'

export interface AIProviderSettingsDocument
  extends Omit<IAIProviderSettings, '_id'>,
    Document {}

const AIProviderSettingsSchema = new Schema<AIProviderSettingsDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: {
      type: String,
      enum: ['openai', 'claude', 'gemini', 'ollama', 'openrouter'],
      required: true,
    },
    apiKey: { type: String }, // AES-256 encrypted
    ollamaEndpoint: { type: String },
    openrouterBaseUrl: { type: String },
    defaultModel: { type: String, required: true },
    generationSettings: {
      temperature: { type: Number, default: 0.7 },
      maxTokens: { type: Number, default: 1024 },
      topP: { type: Number, default: 1.0 },
      systemPrompt: { type: String },
    },
    isActive: { type: Boolean, default: true },
    lastTestedAt: { type: Date },
    testStatus: { type: String, enum: ['success', 'failed'] },
    testError: { type: String },
  },
  { timestamps: true }
)

AIProviderSettingsSchema.index({ userId: 1 })
AIProviderSettingsSchema.index({ userId: 1, provider: 1 }, { unique: true })

export const AIProviderSettings =
  models.AIProviderSettings ||
  model<AIProviderSettingsDocument>('AIProviderSettings', AIProviderSettingsSchema)
