import { Schema, model, models, Document } from 'mongoose'

export interface IMediaAssetDoc {
  userId: Schema.Types.ObjectId
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  /** Base64-encoded file data stored temporarily for same-session LinkedIn upload */
  inlineData?: string
  width?: number
  height?: number
  duration?: number
  altText?: string
  createdAt: Date
  updatedAt: Date
}

export interface MediaAssetDocument extends IMediaAssetDoc, Document {}

const MediaAssetSchema = new Schema<MediaAssetDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    inlineData: { type: String, select: false }, // excluded from normal queries
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number },
    altText: { type: String },
  },
  { timestamps: true }
)

MediaAssetSchema.index({ userId: 1, createdAt: -1 })
MediaAssetSchema.index({ userId: 1, fileType: 1 })

export const MediaAsset =
  models.MediaAsset || model<MediaAssetDocument>('MediaAsset', MediaAssetSchema)
