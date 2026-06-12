'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { History, ExternalLink, Loader2, TrendingUp, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiRequest, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface PublishedPost {
  _id: string
  content: string
  hashtags: string[]
  publishedAt: string
  publishMethod: string
  linkedinPostUrl?: string
  postType: string
}

export default function PublishedPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['published'],
    queryFn: () => apiRequest<{ items: PublishedPost[]; total: number }>('/api/posts?status=published'),
  })

  const syncPosts = useMutation({
    mutationFn: () => apiRequest<{ success: boolean; deletedCount: number }>('/api/posts/sync', { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['published'] })
      if (data.deletedCount > 0) {
        toast.success(`Synced! Removed ${data.deletedCount} deleted post(s).`)
      } else {
        toast.success('Everything is up to date!')
      }
    },
    onError: (err: any) => toast.error(`Sync failed: ${err.message}`)
  })

  const methodColors: Record<string, string> = {
    manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    scheduled: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    auto: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Published Posts</h1>
          <p className="text-muted-foreground mt-1">Your complete LinkedIn publishing history</p>
        </div>
        <Button variant="outline" onClick={() => syncPosts.mutate()} disabled={syncPosts.isPending}>
          <RefreshCw className={`w-4 h-4 mr-2 ${syncPosts.isPending ? 'animate-spin' : ''}`} />
          Sync with LinkedIn
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No posts published yet</p>
          <p className="text-sm mt-1">Publish your first post to see it here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.items.map((post) => (
            <Card key={post._id} className="hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${methodColors[post.publishMethod] || ''}`}>
                        {post.publishMethod === 'auto' ? '⚡ Auto-published' : post.publishMethod === 'scheduled' ? '🕐 Scheduled' : '✓ Manual'}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(post.publishedAt)}</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-3 leading-relaxed">{post.content}</p>
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.hashtags.slice(0, 5).map((h) => (
                          <span key={h} className="text-xs text-primary/70">#{h}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {post.linkedinPostUrl && (
                    <a
                      href={post.linkedinPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline whitespace-nowrap flex-shrink-0 mt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View post
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
