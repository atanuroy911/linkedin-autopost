'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Target, Plus, Play, Pause, Trash2, Edit3, ChevronRight,
  ChevronLeft, Clock, Sparkles, Check, MailCheck, Zap, X, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { apiRequest, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

/* ─── types ──────────────────────────────────────────────────────────────── */

interface CampaignSchedule {
  frequency: 'weekly' | 'monthly'
  daysOfWeek: number[]
  daysOfMonth: number[]
  time: string
  timezone: string
  cronExpression: string
}

interface Campaign {
  _id: string
  name: string
  description?: string
  niche: { industry: string; topics: string[]; keywords: string[] }
  tone: string
  examplePosts: string[]
  schedule: CampaignSchedule
  approvalMode: 'auto' | 'email'
  isActive: boolean
  lastRunAt?: string
  postsGenerated: number
  createdAt: string
}

type View = 'list' | 'create' | 'edit'

/* ─── constants ──────────────────────────────────────────────────────────── */

const INDUSTRIES = [
  'Technology', 'Marketing', 'Finance', 'Healthcare', 'Education',
  'Consulting', 'Sales', 'HR & People', 'Product Management', 'Design',
  'Operations', 'Legal', 'Real Estate', 'Retail', 'Manufacturing', 'Other',
]
const TONES = ['Professional', 'Conversational', 'Story-driven', 'Educational', 'Inspirational', 'Thought Leadership']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Kolkata',
  'Asia/Dhaka', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
]

function describeSchedule(s: CampaignSchedule): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  if (s.frequency === 'weekly') {
    const days = (s.daysOfWeek || []).map((d) => dayNames[d]).join(', ')
    return `Every ${days || '?'} at ${s.time}`
  }
  const suffix = (n: number) => ['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 3)] || 'th'
  const days = (s.daysOfMonth || []).map((d) => `${d}${suffix(d)}`).join(', ')
  return `Monthly on ${days || '?'} at ${s.time}`
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */

export default function CampaignsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('list')
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiRequest<{ campaigns: Campaign[] }>('/api/campaigns'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest(`/api/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
    onError: (e: any) => toast.error(e.message || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/campaigns/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign deleted')
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete'),
  })

  const campaigns = data?.campaigns || []

  if (view === 'create') {
    return (
      <CampaignWizard
        onDone={() => { setView('list'); queryClient.invalidateQueries({ queryKey: ['campaigns'] }) }}
        onCancel={() => setView('list')}
      />
    )
  }

  if (view === 'edit' && editingCampaign) {
    return (
      <CampaignEditor
        campaign={editingCampaign}
        onDone={() => { setView('list'); queryClient.invalidateQueries({ queryKey: ['campaigns'] }) }}
        onCancel={() => setView('list')}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="w-8 h-8" /> Campaigns
          </h1>
          <p className="text-muted-foreground mt-1">Scheduled auto-posting campaigns with AI-generated content</p>
        </div>
        <Button onClick={() => setView('create')} size="lg" className="gap-2">
          <Plus className="w-5 h-5" /> New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2].map((i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg">No campaigns yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Create your first campaign to start auto-generating and posting LinkedIn content on a schedule.
            </p>
          </div>
          <Button onClick={() => setView('create')} size="lg" className="gap-2 mt-2">
            <Plus className="w-5 h-5" /> Create Campaign
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <CampaignCard
              key={c._id}
              campaign={c}
              onToggle={(isActive) => toggleMutation.mutate({ id: c._id, isActive })}
              onEdit={() => { setEditingCampaign(c); setView('edit') }}
              onDelete={() => {
                if (confirm(`Delete "${c.name}"? This cannot be undone.`)) {
                  deleteMutation.mutate(c._id)
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Campaign Card ───────────────────────────────────────────────────────── */

function CampaignCard({
  campaign: c, onToggle, onEdit, onDelete,
}: {
  campaign: Campaign
  onToggle: (v: boolean) => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={cn(
      'rounded-xl border-2 p-5 transition-all',
      c.isActive ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: info */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-base">{c.name}</h3>
            <span className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              c.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            )}>
              {c.isActive ? '● Active' : '○ Paused'}
            </span>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full border',
              c.approvalMode === 'auto'
                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
            )}>
              {c.approvalMode === 'auto' ? <><Zap className="inline w-3 h-3 mr-1" />Auto-post</> : <><MailCheck className="inline w-3 h-3 mr-1" />Email approval</>}
            </span>
          </div>

          {/* Niche chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
              {c.niche.industry}
            </span>
            {c.niche.topics.slice(0, 3).map((t) => (
              <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t}</span>
            ))}
            {c.niche.topics.length > 3 && (
              <span className="text-xs text-muted-foreground">+{c.niche.topics.length - 3} more</span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {describeSchedule(c.schedule)}
            </span>
            <span>🎙 {c.tone}</span>
            <span>📊 {c.postsGenerated} posts generated</span>
            {c.lastRunAt && <span>Last run: {new Date(c.lastRunAt).toLocaleDateString()}</span>}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active toggle */}
          <button
            onClick={() => onToggle(!c.isActive)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              c.isActive
                ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'
            )}
          >
            {c.isActive ? <><Pause className="w-3 h-3" />Pause</> : <><Play className="w-3 h-3" />Start</>}
          </button>
          <button onClick={onEdit} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   CREATION WIZARD  (5 steps)
══════════════════════════════════════════════════════════════════════════ */

interface WizardState {
  // Step 1 — Identity
  name: string
  description: string
  // Step 2 — Niche (locked)
  industry: string
  topics: string[]
  keywords: string[]
  // Step 3 — Style
  tone: string
  examplePosts: [string, string, string]
  // Step 4 — Schedule
  frequency: 'weekly' | 'monthly'
  daysOfWeek: number[]
  daysOfMonth: number[]
  time: string
  timezone: string
  // Step 5 — Approval
  approvalMode: 'auto' | 'email'
}

const defaultWizard: WizardState = {
  name: '', description: '',
  industry: '', topics: [], keywords: [],
  tone: 'Professional', examplePosts: ['', '', ''],
  frequency: 'weekly', daysOfWeek: [1], daysOfMonth: [1],
  time: '09:00', timezone: 'UTC',
  approvalMode: 'email',
}

function CampaignWizard({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardState>(defaultWizard)
  const [tagInput, setTagInput] = useState({ topics: '', keywords: '' })
  const totalSteps = 5

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          niche: { industry: form.industry, topics: form.topics, keywords: form.keywords },
          tone: form.tone,
          examplePosts: form.examplePosts.filter(Boolean),
          schedule: {
            frequency: form.frequency,
            daysOfWeek: form.daysOfWeek,
            daysOfMonth: form.daysOfMonth,
            time: form.time,
            timezone: form.timezone,
          },
          approvalMode: form.approvalMode,
          isActive: true,
        }),
      }),
    onSuccess: () => {
      toast.success('Campaign created and activated! 🚀')
      onDone()
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create campaign'),
  })

  function addTag(field: 'topics' | 'keywords') {
    const val = tagInput[field].trim()
    if (!val) return
    setForm((f) => ({ ...f, [field]: [...f[field], val] }))
    setTagInput((t) => ({ ...t, [field]: '' }))
  }
  function removeTag(field: 'topics' | 'keywords', val: string) {
    setForm((f) => ({ ...f, [field]: f[field].filter((v) => v !== val) }))
  }

  function canAdvance(): boolean {
    if (step === 1) return form.name.trim().length > 0
    if (step === 2) return form.industry.length > 0
    if (step === 3) return true
    if (step === 4) {
      if (form.frequency === 'weekly') return form.daysOfWeek.length > 0
      return form.daysOfMonth.length > 0
    }
    return true
  }

  return (
    <div className="max-w-2xl mx-auto animate-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
          <p className="text-sm text-muted-foreground">Step {step} of {totalSteps}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className={cn(
            'h-1.5 flex-1 rounded-full transition-all',
            i + 1 <= step ? 'bg-primary' : 'bg-muted'
          )} />
        ))}
      </div>

      <div className="space-y-6">
        {/* ── Step 1: Identity ── */}
        {step === 1 && (
          <div className="space-y-4">
            <StepTitle>Name your campaign</StepTitle>
            <div className="space-y-2">
              <label className="text-sm font-medium">Campaign name *</label>
              <Input
                placeholder="e.g. Weekly AI Insights, Founder Thought Leadership…"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description <span className="text-muted-foreground">(optional)</span></label>
              <Textarea
                placeholder="What is this campaign about?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Niche (LOCKED) ── */}
        {step === 2 && (
          <div className="space-y-5">
            <StepTitle>Define your niche</StepTitle>
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>This niche is <strong>locked after creation</strong>. To change it, you'll need to delete this campaign and create a new one.</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Industry *</label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((ind) => (
                  <button key={ind} onClick={() => setForm((f) => ({ ...f, industry: ind }))}
                    className={cn('px-3 py-1.5 rounded-full text-xs border transition-all',
                      form.industry === ind ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/50')}>
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <TagField label="Topics" placeholder="e.g. AI in Healthcare (press Enter)" tags={form.topics}
              input={tagInput.topics} onInputChange={(v) => setTagInput((t) => ({ ...t, topics: v }))}
              onAdd={() => addTag('topics')} onRemove={(v) => removeTag('topics', v)} color="primary" />

            <TagField label="Keywords" placeholder="e.g. leadership, growth (press Enter)" tags={form.keywords}
              input={tagInput.keywords} onInputChange={(v) => setTagInput((t) => ({ ...t, keywords: v }))}
              onAdd={() => addTag('keywords')} onRemove={(v) => removeTag('keywords', v)} color="secondary" />
          </div>
        )}

        {/* ── Step 3: Style ── */}
        {step === 3 && (
          <div className="space-y-5">
            <StepTitle>Set your style</StepTitle>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button key={t} onClick={() => setForm((f) => ({ ...f, tone: t }))}
                    className={cn('px-3 py-1.5 rounded-full text-sm border transition-all',
                      form.tone === t ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/50')}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Example posts <span className="text-muted-foreground">(optional — helps AI match your style)</span></label>
                <p className="text-xs text-muted-foreground mt-0.5">Paste 1–3 LinkedIn posts you love. AI will write in a similar style.</p>
              </div>
              {([0, 1, 2] as const).map((i) => (
                <Textarea
                  key={i}
                  placeholder={`Example post ${i + 1}…`}
                  value={form.examplePosts[i]}
                  onChange={(e) => setForm((f) => {
                    const ep = [...f.examplePosts] as [string, string, string]
                    ep[i] = e.target.value
                    return { ...f, examplePosts: ep }
                  })}
                  rows={3}
                  className="resize-none text-sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Step 4: Schedule ── */}
        {step === 4 && (
          <div className="space-y-5">
            <StepTitle>Set your schedule</StepTitle>

            {/* Frequency */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
              {(['weekly', 'monthly'] as const).map((f) => (
                <button key={f} onClick={() => setForm((s) => ({ ...s, frequency: f }))}
                  className={cn('px-4 py-2 rounded-md text-sm font-medium transition-all capitalize',
                    form.frequency === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  {f}
                </button>
              ))}
            </div>

            {/* Days of week */}
            {form.frequency === 'weekly' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Days *</label>
                <div className="flex gap-2">
                  {DAYS.map((d, i) => (
                    <button key={d} onClick={() => setForm((f) => ({
                      ...f, daysOfWeek: f.daysOfWeek.includes(i) ? f.daysOfWeek.filter((x) => x !== i) : [...f.daysOfWeek, i],
                    }))}
                      className={cn('w-10 h-10 rounded-full text-sm font-medium border transition-all',
                        form.daysOfWeek.includes(i) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50')}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Days of month */}
            {form.frequency === 'monthly' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Days of month *</label>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <button key={d} onClick={() => setForm((f) => ({
                      ...f, daysOfMonth: f.daysOfMonth.includes(d) ? f.daysOfMonth.filter((x) => x !== d) : [...f.daysOfMonth, d],
                    }))}
                      className={cn('h-9 rounded-lg text-xs font-medium border transition-all',
                        form.daysOfMonth.includes(d) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50')}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Time (24h)</label>
                <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Timezone</label>
                <select
                  value={form.timezone}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              📅 Preview: {form.frequency === 'weekly'
                ? `Every ${form.daysOfWeek.map((d) => DAYS[d]).join(', ') || '—'} at ${form.time} (${form.timezone})`
                : `Monthly on day ${form.daysOfMonth.join(', ') || '—'} at ${form.time} (${form.timezone})`}
            </div>
          </div>
        )}

        {/* ── Step 5: Approval & Review ── */}
        {step === 5 && (
          <div className="space-y-5">
            <StepTitle>Approval & launch</StepTitle>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setForm((f) => ({ ...f, approvalMode: 'auto' }))}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  form.approvalMode === 'auto' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                )}
              >
                <Zap className={cn('w-6 h-6 mb-2', form.approvalMode === 'auto' ? 'text-primary' : 'text-muted-foreground')} />
                <p className="font-semibold text-sm">Auto-post</p>
                <p className="text-xs text-muted-foreground mt-1">Posts go straight to LinkedIn without any review</p>
              </button>
              <button
                onClick={() => setForm((f) => ({ ...f, approvalMode: 'email' }))}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  form.approvalMode === 'email' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                )}
              >
                <MailCheck className={cn('w-6 h-6 mb-2', form.approvalMode === 'email' ? 'text-primary' : 'text-muted-foreground')} />
                <p className="font-semibold text-sm">Email approval</p>
                <p className="text-xs text-muted-foreground mt-1">You'll get an email to review before publishing</p>
              </button>
            </div>

            {/* Review summary */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 text-sm">
              <p className="font-semibold">Campaign summary</p>
              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex gap-2"><span className="text-foreground font-medium w-24 shrink-0">Name:</span>{form.name}</div>
                <div className="flex gap-2"><span className="text-foreground font-medium w-24 shrink-0">Industry:</span>{form.industry}</div>
                <div className="flex gap-2"><span className="text-foreground font-medium w-24 shrink-0">Topics:</span>{form.topics.join(', ') || '—'}</div>
                <div className="flex gap-2"><span className="text-foreground font-medium w-24 shrink-0">Tone:</span>{form.tone}</div>
                <div className="flex gap-2"><span className="text-foreground font-medium w-24 shrink-0">Schedule:</span>{
                  form.frequency === 'weekly'
                    ? `Every ${form.daysOfWeek.map((d) => DAYS[d]).join(', ')} at ${form.time}`
                    : `Monthly on ${form.daysOfMonth.join(', ')} at ${form.time}`
                } ({form.timezone})</div>
                <div className="flex gap-2"><span className="text-foreground font-medium w-24 shrink-0">Approval:</span>{form.approvalMode === 'auto' ? 'Auto-post' : 'Email approval'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-4 border-t border-border">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          {step < totalSteps ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()} className="ml-auto">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="ml-auto gap-2"
              size="lg"
            >
              {createMutation.isPending
                ? <><Sparkles className="w-4 h-4 animate-spin" />Launching...</>
                : <><Sparkles className="w-4 h-4" />Launch Campaign</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CAMPAIGN EDITOR (edit everything except niche)
═══════════════════════════════════════════════════════════════ */

function CampaignEditor({ campaign, onDone, onCancel }: {
  campaign: Campaign
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(campaign.name)
  const [description, setDescription] = useState(campaign.description || '')
  const [tone, setTone] = useState(campaign.tone)
  const [examples, setExamples] = useState<[string, string, string]>([
    campaign.examplePosts[0] || '',
    campaign.examplePosts[1] || '',
    campaign.examplePosts[2] || '',
  ])
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>(campaign.schedule.frequency)
  const [daysOfWeek, setDow] = useState<number[]>(campaign.schedule.daysOfWeek || [])
  const [daysOfMonth, setDom] = useState<number[]>(campaign.schedule.daysOfMonth || [])
  const [time, setTime] = useState(campaign.schedule.time)
  const [timezone, setTimezone] = useState(campaign.schedule.timezone)
  const [approvalMode, setApprovalMode] = useState<'auto' | 'email'>(campaign.approvalMode)

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/campaigns/${campaign._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name, description, tone,
          examplePosts: examples.filter(Boolean),
          schedule: { frequency, daysOfWeek, daysOfMonth, time, timezone },
          approvalMode,
        }),
      }),
    onSuccess: () => {
      toast.success('Campaign updated')
      onDone()
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update'),
  })

  return (
    <div className="max-w-2xl mx-auto animate-in space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Campaign</h1>
          <p className="text-sm text-muted-foreground">Niche cannot be changed</p>
        </div>
      </div>

      {/* Locked niche display */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Niche (locked)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs bg-secondary px-2 py-0.5 rounded-full font-medium">{campaign.niche.industry}</span>
          {campaign.niche.topics.map((t) => <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t}</span>)}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="resize-none" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tone</label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button key={t} onClick={() => setTone(t)}
                className={cn('px-3 py-1.5 rounded-full text-sm border transition-all',
                  tone === t ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/50')}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Approval mode</label>
          <div className="grid grid-cols-2 gap-3">
            {(['auto', 'email'] as const).map((mode) => (
              <button key={mode} onClick={() => setApprovalMode(mode)}
                className={cn('p-3 rounded-xl border-2 text-left transition-all text-sm',
                  approvalMode === mode ? 'border-primary bg-primary/5' : 'border-border')}>
                {mode === 'auto' ? '⚡ Auto-post' : '✉️ Email approval'}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Schedule</label>
          <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
            {(['weekly', 'monthly'] as const).map((f) => (
              <button key={f} onClick={() => setFrequency(f)}
                className={cn('px-4 py-2 rounded-md text-sm font-medium transition-all capitalize',
                  frequency === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}>
                {f}
              </button>
            ))}
          </div>
          {frequency === 'weekly' && (
            <div className="flex gap-2">
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => setDow((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}
                  className={cn('w-10 h-10 rounded-full text-sm font-medium border transition-all',
                    daysOfWeek.includes(i) ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                  {d}
                </button>
              ))}
            </div>
          )}
          {frequency === 'monthly' && (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <button key={d} onClick={() => setDom((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}
                  className={cn('h-9 rounded-lg text-xs font-medium border transition-all',
                    daysOfMonth.includes(d) ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                  {d}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Time</label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Timezone</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="ml-auto">
          {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

/* ─── shared small components ─────────────────────────────────────────────── */

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold tracking-tight">{children}</h2>
}

function TagField({ label, placeholder, tags, input, onInputChange, onAdd, onRemove, color }: {
  label: string; placeholder: string; tags: string[]; input: string
  onInputChange: (v: string) => void; onAdd: () => void; onRemove: (v: string) => void
  color: 'primary' | 'secondary'
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
        />
        <Button type="button" variant="outline" onClick={onAdd}><Plus className="w-4 h-4" /></Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className={cn('flex items-center gap-1 text-xs px-3 py-1 rounded-full',
              color === 'primary' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground')}>
              {t}
              <button onClick={() => onRemove(t)}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
