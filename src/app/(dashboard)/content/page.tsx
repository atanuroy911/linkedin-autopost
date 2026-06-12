'use client'
import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, Loader2, Check, ChevronRight, RotateCcw,
  Send, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { apiRequest } from '@/lib/utils'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

/* ─────────────────────────── shared types ─────────────────────────── */

const TONE_OPTIONS = [
  { value: 'Professional', emoji: '🎯' },
  { value: 'Conversational', emoji: '💬' },
  { value: 'Story-driven', emoji: '📖' },
  { value: 'Educational', emoji: '🎓' },
  { value: 'Inspirational', emoji: '✨' },
]

type ActiveTab = 'discover' | 'iread'

/* ─────────────────────────── main page ─────────────────────────── */

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('discover')

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content</h1>
        <p className="text-muted-foreground mt-1">Turn what you know — or what you read — into LinkedIn posts.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <TabButton
          active={activeTab === 'discover'}
          onClick={() => setActiveTab('discover')}
          icon={<Sparkles className="w-4 h-4" />}
          label="Discover"
        />
        <TabButton
          active={activeTab === 'iread'}
          onClick={() => setActiveTab('iread')}
          icon={<BookOpen className="w-4 h-4" />}
          label="I Read"
        />
      </div>

      {activeTab === 'discover' && <DiscoverTab />}
      {activeTab === 'iread' && <IReadTab />}
    </div>
  )
}

function TabButton({
  active, onClick, icon, label,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
        active ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DISCOVER TAB
═══════════════════════════════════════════════════════════════ */

interface ContentIdea {
  title: string
  angle: string
  hook: string
  tags: string[]
}

type DiscoverStage = 'input' | 'discovering' | 'ideas' | 'generating'

function DiscoverTab() {
  const queryClient = useQueryClient()
  const [stage, setStage] = useState<DiscoverStage>('input')
  const [sourceContent, setSourceContent] = useState('')
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [tone, setTone] = useState('Professional')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const discover = useMutation({
    mutationFn: () =>
      apiRequest<{ ideas: ContentIdea[] }>('/api/content/discover', {
        method: 'POST',
        body: JSON.stringify({ sourceContent }),
      }),
    onSuccess: (data) => {
      const safe = (data.ideas || []).map((idea: any) => ({
        title: idea.title || 'Untitled idea',
        angle: idea.angle || '',
        hook: idea.hook || '',
        tags: Array.isArray(idea.tags) ? idea.tags : [],
      }))
      setIdeas(safe)
      setStage('ideas')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Discovery failed. Try again.')
      setStage('input')
    },
  })

  const generate = useMutation({
    mutationFn: () => {
      const selectedIdeas = ideas.filter((_, i) => selected.has(i))
      return Promise.all(
        selectedIdeas.map((idea) =>
          apiRequest('/api/posts', {
            method: 'POST',
            body: JSON.stringify({
              topic: `${idea.title}: ${idea.angle}. Opening hook: "${idea.hook}"`,
              keywords: idea.tags,
              tone,
              count: 1,
            }),
          })
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`${selected.size} post${selected.size > 1 ? 's' : ''} queued! Check your Drafts.`, {
        duration: 6000, icon: '🚀',
      })
      reset()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Generation failed.')
      setStage('ideas')
    },
  })

  function handleDiscover() {
    if (!sourceContent.trim()) {
      toast.error('Paste some content first')
      textareaRef.current?.focus()
      return
    }
    setStage('discovering')
    discover.mutate()
  }

  function toggleIdea(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function reset() {
    setStage('input')
    setSourceContent('')
    setIdeas([])
    setSelected(new Set())
  }

  return (
    <div className="space-y-6">
      {stage !== 'input' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <StepPill n={1} label="Paste" done={true} active={false} />
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <StepPill n={2} label="Discover" done={stage === 'generating'} active={stage === 'discovering' || stage === 'ideas'} />
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <StepPill n={3} label="Generate" done={false} active={stage === 'generating'} />
          </div>
          <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
            <RotateCcw className="w-4 h-4 mr-1.5" /> Start over
          </Button>
        </div>
      )}

      {stage === 'input' && (
        <div className="space-y-4">
          <Textarea
            ref={textareaRef}
            placeholder="Paste anything — notes, a blog article, a report, ideas, meeting notes…&#10;AI will extract content angles from it."
            value={sourceContent}
            onChange={(e) => setSourceContent(e.target.value)}
            rows={9}
            className="resize-none text-base leading-relaxed"
          />
          <Button onClick={handleDiscover} size="lg" className="w-full text-base font-semibold">
            <Sparkles className="w-5 h-5 mr-2" /> Discover Content Ideas
          </Button>
          <EmptyStateHint
            icon={<Sparkles className="w-6 h-6 text-primary" />}
            title="How it works"
            body="Paste any text. AI extracts your expertise and suggests 6 ready-to-write LinkedIn angles to choose from."
          />
        </div>
      )}

      {stage === 'discovering' && (
        <LoadingState icon={<Sparkles className="w-8 h-8 text-primary" />} pingColor="border-primary/30" title="Reading your content..." subtitle="Extracting themes, expertise, and post angles" />
      )}

      {stage === 'ideas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selected.size === 0 ? 'Select ideas to generate posts from' : `${selected.size} selected`}
            </p>
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground">
                Clear
              </button>
            )}
          </div>

          <div className="grid gap-3">
            {ideas.map((idea, i) => (
              <IdeaCard key={i} idea={idea} selected={selected.has(i)} onToggle={() => toggleIdea(i)} />
            ))}
          </div>

          {selected.size > 0 && (
            <div className="border-t border-border pt-5 space-y-4 animate-in">
              <ToneSelector tone={tone} setTone={setTone} />
              <Button
                onClick={() => { setStage('generating'); generate.mutate() }}
                disabled={generate.isPending}
                size="lg"
                className="w-full text-base font-semibold"
              >
                {generate.isPending
                  ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating {selected.size} post{selected.size > 1 ? 's' : ''}...</>
                  : <><Send className="w-5 h-5 mr-2" />Generate {selected.size} Post{selected.size > 1 ? 's' : ''}</>}
              </Button>
            </div>
          )}
        </div>
      )}

      {stage === 'generating' && (
        <LoadingState icon={<Send className="w-8 h-8 text-emerald-500" />} pingColor="border-emerald-500/30" title="Writing your posts..." subtitle={`Generating ${selected.size} LinkedIn post${selected.size > 1 ? 's' : ''} — takes 10–20 seconds`} />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   I READ TAB
═══════════════════════════════════════════════════════════════ */

interface IReadPost {
  angle: string
  angleLabel: string
  summary: string
  content: string
  hashtags: string[]
}

type IReadStage = 'input' | 'generating' | 'review' | 'saving'

const ANGLE_COLORS: Record<string, string> = {
  key_insight: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  practical_application: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  nuanced_take: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
}

function IReadTab() {
  const queryClient = useQueryClient()
  const [stage, setStage] = useState<IReadStage>('input')
  const [articleContent, setArticleContent] = useState('')
  const [tone, setTone] = useState('Conversational')
  const [posts, setPosts] = useState<IReadPost[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0, 1, 2]))
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const generate = useMutation({
    mutationFn: () =>
      apiRequest<{ posts: IReadPost[] }>('/api/content/iread', {
        method: 'POST',
        body: JSON.stringify({ content: articleContent, tone }),
      }),
    onSuccess: (data) => {
      const safe = (data.posts || []).map((p: any) => ({
        angle: p.angle || 'insight',
        angleLabel: p.angleLabel || 'Insight',
        summary: p.summary || '',
        content: p.content || '',
        hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
      }))
      setPosts(safe)
      // Pre-select all 3
      setSelected(new Set(safe.map((_, i) => i)))
      setStage('review')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to generate posts.')
      setStage('input')
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      const selectedPosts = posts.filter((_, i) => selected.has(i))
      return Promise.all(
        selectedPosts.map((post) =>
          apiRequest('/api/posts/draft', {
            method: 'POST',
            body: JSON.stringify({
              content: `${post.content}\n\n${post.hashtags.map((h) => `#${h}`).join(' ')}`,
              hashtags: post.hashtags,
            }),
          })
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(
        `${selected.size} post${selected.size > 1 ? 's' : ''} saved to Drafts!`,
        { duration: 6000, icon: '✅' }
      )
      reset()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save drafts.')
      setStage('review')
    },
  })

  function handleGenerate() {
    if (!articleContent.trim()) {
      toast.error('Paste the article content first')
      textareaRef.current?.focus()
      return
    }
    setStage('generating')
    generate.mutate()
  }

  function togglePost(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function toggleExpand(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function reset() {
    setStage('input')
    setArticleContent('')
    setPosts([])
    setSelected(new Set())
    setExpanded(new Set([0, 1, 2]))
  }

  return (
    <div className="space-y-6">
      {stage !== 'input' && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
            <RotateCcw className="w-4 h-4 mr-1.5" /> Start over
          </Button>
        </div>
      )}

      {stage === 'input' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            📖 Paste any article, research paper, or blog post you&apos;ve read. AI will write 3 LinkedIn posts as if you&apos;re sharing your key takeaways — from 3 different angles.
          </div>

          <Textarea
            ref={textareaRef}
            placeholder="Paste the article or paper content here…"
            value={articleContent}
            onChange={(e) => setArticleContent(e.target.value)}
            rows={10}
            className="resize-none text-base leading-relaxed"
          />

          <div>
            <p className="text-sm font-medium mb-2.5">Tone</p>
            <ToneSelector tone={tone} setTone={setTone} />
          </div>

          <Button onClick={handleGenerate} size="lg" className="w-full text-base font-semibold">
            <BookOpen className="w-5 h-5 mr-2" /> Summarise & Write 3 Posts
          </Button>
        </div>
      )}

      {stage === 'generating' && (
        <LoadingState
          icon={<BookOpen className="w-8 h-8 text-primary" />}
          pingColor="border-primary/30"
          title="Reading the article..."
          subtitle="Summarising and writing 3 unique LinkedIn perspectives"
        />
      )}

      {stage === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selected.size} of {posts.length} posts selected
            </p>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <button onClick={() => setSelected(new Set(posts.map((_, i) => i)))} className="hover:text-foreground">All</button>
              <span>·</span>
              <button onClick={() => setSelected(new Set())} className="hover:text-foreground">None</button>
            </div>
          </div>

          <div className="space-y-3">
            {posts.map((post, i) => {
              const isSelected = selected.has(i)
              const isExpanded = expanded.has(i)
              const colorClass = ANGLE_COLORS[post.angle] || 'bg-muted text-muted-foreground'

              return (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl border-2 transition-all duration-150',
                    isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  )}
                >
                  {/* Card header — click to select */}
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer"
                    onClick={() => togglePost(i)}
                  >
                    <div
                      className={cn(
                        'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', colorClass)}>
                          {post.angleLabel}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{post.summary}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleExpand(i) }}
                      className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                    >
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded post preview */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border/50 pt-3">
                      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                        {post.content}
                      </p>
                      {post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {post.hashtags.map((h) => (
                            <span key={h} className="text-xs text-primary/70">#{h}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {selected.size > 0 && (
            <Button
              onClick={() => { setStage('saving'); save.mutate() }}
              disabled={save.isPending}
              size="lg"
              className="w-full text-base font-semibold"
            >
              {save.isPending
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Saving to Drafts...</>
                : <><Send className="w-5 h-5 mr-2" />Save {selected.size} Post{selected.size > 1 ? 's' : ''} to Drafts</>}
            </Button>
          )}
        </div>
      )}

      {stage === 'saving' && (
        <LoadingState
          icon={<Send className="w-8 h-8 text-emerald-500" />}
          pingColor="border-emerald-500/30"
          title="Saving to Drafts..."
          subtitle="Your posts will appear in Drafts momentarily"
        />
      )}
    </div>
  )
}

/* ─────────────────────────── shared components ─────────────────────────── */

function IdeaCard({ idea, selected, onToggle }: { idea: ContentIdea; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full text-left rounded-xl border-2 p-4 transition-all duration-150 hover:shadow-sm group',
        selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30 bg-card'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
          selected ? 'border-primary bg-primary' : 'border-muted-foreground/30 group-hover:border-primary/50'
        )}>
          {selected && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug">{idea.title}</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{idea.angle}</p>
          {idea.hook && (
            <p className="text-xs italic text-foreground/60 mt-2 border-l-2 border-primary/30 pl-2">
              &ldquo;{idea.hook}&rdquo;
            </p>
          )}
          {idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {idea.tags.map((tag) => (
                <span key={tag} className="text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function ToneSelector({ tone, setTone }: { tone: string; setTone: (t: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TONE_OPTIONS.map(({ value, emoji }) => (
        <button
          key={value}
          onClick={() => setTone(value)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm border transition-all',
            tone === value
              ? 'border-primary bg-primary/10 text-primary font-medium'
              : 'border-border text-muted-foreground hover:border-primary/50'
          )}
        >
          {emoji} {value}
        </button>
      ))}
    </div>
  )
}

function LoadingState({ icon, pingColor, title, subtitle }: {
  icon: React.ReactNode
  pingColor: string
  title: string
  subtitle: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
          {icon}
        </div>
        <div className={cn('absolute inset-0 rounded-full border-2 animate-ping', pingColor)} />
      </div>
      <div className="text-center">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  )
}

function EmptyStateHint({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">{body}</p>
    </div>
  )
}

function StepPill({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all',
      done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : active ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground'
    )}>
      {done ? <Check className="w-3 h-3" /> : <span className="opacity-60">{n}.</span>}
      {label}
    </div>
  )
}
