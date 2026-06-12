import { Types } from 'mongoose'

export type UserRole = 'admin' | 'user'

export type PostStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'rejected'

export type PostType = 'text' | 'image' | 'video' | 'link' | 'document'

export type AIProvider = 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter'



export type NotificationType =
  | 'draft_created'
  | 'approval_required'
  | 'post_scheduled'
  | 'post_published'
  | 'linkedin_expired'
  | 'ai_generation_failed'
  | 'auto_publish_warning'

export interface IUser {
  _id: Types.ObjectId
  email: string
  name: string
  passwordHash: string
  role: UserRole
  isActive: boolean
  emailVerified: boolean
  avatar?: string
  settings: {
    autoPublish: boolean
    autoPublishDelayHours: number
    emailNotifications: boolean
    inAppNotifications: boolean
  }
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

export interface ILinkedInAccount {
  _id: Types.ObjectId
  userId: Types.ObjectId
  linkedinId: string
  profileUrl: string
  displayName: string
  avatar?: string
  accessToken: string // encrypted
  refreshToken?: string // encrypted
  tokenExpiresAt: Date
  scope: string
  isConnected: boolean
  connectedAt: Date
  disconnectedAt?: Date
}

export interface IAIProviderSettings {
  _id: Types.ObjectId
  userId: Types.ObjectId
  provider: AIProvider
  apiKey?: string // encrypted
  ollamaEndpoint?: string
  openrouterBaseUrl?: string
  defaultModel: string
  generationSettings: {
    temperature: number
    maxTokens: number
    topP: number
    systemPrompt?: string
  }
  isActive: boolean
  lastTestedAt?: Date
  testStatus?: 'success' | 'failed'
  testError?: string
  createdAt: Date
  updatedAt: Date
}

export interface ITopic {
  _id: Types.ObjectId
  userId: Types.ObjectId
  name: string
  industry: string
  topics: string[]
  keywords: string[]
  contentPillars: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IGeneratedPost {
  _id: Types.ObjectId
  userId: Types.ObjectId
  topicId?: Types.ObjectId
  aiProvider: AIProvider
  modelUsed: string
  content: string
  hashtags: string[]
  postType: PostType
  mediaAssetIds: Types.ObjectId[]
  externalUrl?: string
  status: PostStatus
  rating?: number
  rejectionReason?: string
  generatedAt: Date
  approvedAt?: Date
  rejectedAt?: Date
  autoPublishDeadline?: Date
}

export interface IScheduledPost {
  _id: Types.ObjectId
  userId: Types.ObjectId
  generatedPostId: Types.ObjectId
  content: string
  hashtags: string[]
  postType: PostType
  mediaAssetIds: Types.ObjectId[]
  externalUrl?: string
  scheduledFor: Date
  timezone: string
  jobId?: string
  status: 'pending' | 'processing' | 'published' | 'failed' | 'cancelled'
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

export interface IPublishedPost {
  _id: Types.ObjectId
  userId: Types.ObjectId
  generatedPostId?: Types.ObjectId
  scheduledPostId?: Types.ObjectId
  linkedinPostId: string
  linkedinPostUrl?: string
  content: string
  hashtags: string[]
  postType: PostType
  mediaAssetIds: Types.ObjectId[]
  externalUrl?: string
  publishedAt: Date
  publishMethod: 'manual' | 'scheduled' | 'auto'
}

export interface IMediaAsset {
  _id: Types.ObjectId
  userId: Types.ObjectId
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  width?: number
  height?: number
  duration?: number
  altText?: string
  createdAt: Date
}

export interface INotification {
  _id: Types.ObjectId
  userId: Types.ObjectId
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
  isRead: boolean
  readAt?: Date
  createdAt: Date
}

export interface IActivityLog {
  _id: Types.ObjectId
  userId?: Types.ObjectId
  action: string
  resourceType: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Auth types
export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
}

// AI types
export interface GenerationRequest {
  topic: string
  industry?: string
  keywords?: string[]
  contentPillars?: string[]
  count?: number
  tone?: string
  additionalInstructions?: string
}

export interface GeneratedContent {
  content: string
  hashtags: string[]
  postType: PostType
}

export interface TopicIdea {
  title: string
  description: string
  keywords: string[]
  contentPillars: string[]
}
