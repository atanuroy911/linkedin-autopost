'use client'
import { Suspense, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { FileText, Filter, Loader2, Check, X, Edit, Trash2, Eye, Calendar, Send } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, formatRelativeTime, getStatusColor, getStatusLabel, truncateText, getProviderLabel, apiRequest } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { PostStatus } from '@/types'

interface Post {
  _id: string
  content: string
  hashtags: string[]
  status: PostStatus
  aiProvider: string
  modelUsed: string
  generatedAt: string
  postType: string
}

const STATUS_TABS: Array<{ value: PostStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'pending_approval', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'rejected', label: 'Rejected' },
]

function DraftsContent() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const defaultStatus = (searchParams.get('status') || 'all') as PostStatus | 'all'
  const [activeTab, setActiveTab] = useState<PostStatus | 'all'>(defaultStatus)

  const { data, isLoading } = useQuery({
    queryKey: ['posts', activeTab],
    queryFn: () => apiRequest<{ items: Post[]; total: number }>(
      `/api/posts${activeTab !== 'all' ? `?status=${activeTab}` : ''}`
    ),
  })

  const updatePost = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const deletePost = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/posts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post deleted')
    },
  })

  const [isPublishing, setIsPublishing] = useState<string | null>(null)

  async function handleApprove(id: string) {
    setIsPublishing(id)
    const previousPosts = queryClient.getQueryData(['posts', activeTab])
    
    // Optimistic UI update: instantly remove from list
    queryClient.setQueryData(['posts', activeTab], (old: any) => {
      if (!old) return old
      return {
        ...old,
        items: old.items.filter((p: any) => p._id !== id)
      }
    })

    try {
      const res = await apiRequest<{ success: boolean; postUrl?: string; error?: string }>(`/api/posts/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ action: 'publish_now' })
      })
      
      if (res.success) {
        toast.success('Approved & published to LinkedIn!')
      } else {
        throw new Error(res.error || 'Failed to publish')
      }
    } catch (err: unknown) {
      // Revert on failure
      queryClient.setQueryData(['posts', activeTab], previousPosts)
      toast.error(`Failed: ${(err as Error).message}`)
    } finally {
      setIsPublishing(null)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  }

  async function handleReject(id: string) {
    await updatePost.mutateAsync({ id, data: { status: 'rejected' } })
    toast.success('Post rejected')
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Drafts</h1>
        <p className="text-muted-foreground mt-1">Review and manage your AI-generated content</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PostStatus | 'all')}>
        <TabsList className="flex-wrap h-auto gap-1">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No posts found</p>
              <p className="text-sm mt-1">Generate some content from the Content Discovery page</p>
              <Button className="mt-4" asChild>
                <Link href="/content">Generate Content</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {data?.items.map((post) => (
                <Card key={post._id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', getStatusColor(post.status))}>
                            {getStatusLabel(post.status)}
                          </span>
                          <span className="text-xs text-muted-foreground">{getProviderLabel(post.aiProvider)}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(post.generatedAt)}</span>
                        </div>

                        <p className="text-sm text-foreground leading-relaxed line-clamp-3 whitespace-pre-line">
                          {post.content}
                        </p>

                        {post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {post.hashtags.slice(0, 5).map((h) => (
                              <span key={h} className="text-xs text-primary/70">#{h}</span>
                            ))}
                            {post.hashtags.length > 5 && (
                              <span className="text-xs text-muted-foreground">+{post.hashtags.length - 5} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/composer/${post._id}`}>
                          <Edit className="w-3.5 h-3.5" />Edit & Compose
                        </Link>
                      </Button>

                      {post.status === 'draft' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950"
                            onClick={() => handleApprove(post._id)}
                            disabled={updatePost.isPending || isPublishing === post._id}
                          >
                            {isPublishing === post._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Approve & Post
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                            onClick={() => handleReject(post._id)}
                            disabled={updatePost.isPending}
                          >
                            <X className="w-3.5 h-3.5" />Reject
                          </Button>
                        </>
                      )}

                      {['draft', 'rejected'].includes(post.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto text-muted-foreground hover:text-destructive"
                          onClick={() => deletePost.mutate(post._id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function DraftsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}>
      <DraftsContent />
    </Suspense>
  )
}
