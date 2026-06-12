import { Schema, model, models, Document, Types } from 'mongoose'

export interface ICampaignSchedule {
  frequency: 'weekly' | 'monthly'
  daysOfWeek: number[]   // 0=Sun … 6=Sat
  daysOfMonth: number[]  // 1-31
  time: string           // "HH:MM" 24-hour
  timezone: string
  cronExpression: string // auto-computed, stored for removal
}

export interface ICampaign {
  _id: Types.ObjectId
  userId: Types.ObjectId
  name: string
  description?: string

  /** LOCKED after creation */
  niche: {
    industry: string
    topics: string[]
    keywords: string[]
  }

  tone: string
  examplePosts: string[]     // Up to 3 — style hints for AI, editable

  schedule: ICampaignSchedule
  approvalMode: 'auto' | 'email'

  isActive: boolean
  repeatJobKey?: string      // BullMQ repeatable job key for removal

  lastRunAt?: Date
  nextRunAt?: Date
  postsGenerated: number

  createdAt: Date
  updatedAt: Date
}

export interface CampaignDocument extends Omit<ICampaign, '_id'>, Document {}

const ScheduleSchema = new Schema<ICampaignSchedule>(
  {
    frequency: { type: String, enum: ['weekly', 'monthly'], required: true },
    daysOfWeek: [{ type: Number }],
    daysOfMonth: [{ type: Number }],
    time: { type: String, required: true },
    timezone: { type: String, default: 'UTC' },
    cronExpression: { type: String, required: true },
  },
  { _id: false }
)

const CampaignSchema = new Schema<CampaignDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    niche: {
      industry: { type: String, required: true },
      topics: [{ type: String }],
      keywords: [{ type: String }],
    },

    tone: { type: String, default: 'Professional' },
    examplePosts: [{ type: String }],

    schedule: { type: ScheduleSchema, required: true },
    approvalMode: { type: String, enum: ['auto', 'email'], default: 'email' },

    isActive: { type: Boolean, default: false },
    repeatJobKey: { type: String },

    lastRunAt: { type: Date },
    nextRunAt: { type: Date },
    postsGenerated: { type: Number, default: 0 },
  },
  { timestamps: true }
)

CampaignSchema.index({ userId: 1, isActive: 1 })

export const Campaign =
  models.Campaign || model<CampaignDocument>('Campaign', CampaignSchema)

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert schedule config to a standard 5-field cron expression */
export function buildCronExpression(schedule: Omit<ICampaignSchedule, 'cronExpression'>): string {
  const [h, m] = schedule.time.split(':').map(Number)
  const min = isNaN(m) ? 0 : m
  const hr = isNaN(h) ? 9 : h

  if (schedule.frequency === 'weekly') {
    const days = schedule.daysOfWeek.length ? schedule.daysOfWeek.join(',') : '1'
    return `${min} ${hr} * * ${days}`
  }
  // monthly
  const days = schedule.daysOfMonth.length ? schedule.daysOfMonth.join(',') : '1'
  return `${min} ${hr} ${days} * *`
}

/** Human-readable schedule description */
export function describeSchedule(schedule: ICampaignSchedule): string {
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const [h, m] = schedule.time.split(':').map(Number)
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  if (schedule.frequency === 'weekly') {
    const days = schedule.daysOfWeek.map((d) => DAY_NAMES[d]).join(', ')
    return `Every ${days} at ${timeStr}`
  }
  const days = schedule.daysOfMonth.join(', ')
  const suffix = (n: number) => ['th','st','nd','rd'][(n%100 > 10 && n%100 < 14) ? 0 : Math.min(n % 10, 3)] || 'th'
  const daysStr = schedule.daysOfMonth.map((d) => `${d}${suffix(d)}`).join(', ')
  return `Every month on the ${daysStr} at ${timeStr}`
}
