'use client'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, ExternalLink, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiRequest, formatDateTime, formatRelativeTime } from '@/lib/utils'

interface ScheduledPost {
  _id: string
  content: string
  hashtags: string[]
  scheduledFor: string
  status: string
  postType: string
}

export default function ScheduledPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['scheduled'],
    queryFn: () => apiRequest<{ items: ScheduledPost[]; total: number }>('/api/posts?status=scheduled'),
  })

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scheduled Posts</h1>
        <p className="text-muted-foreground mt-1">Posts queued for automatic publishing</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No scheduled posts</p>
          <p className="text-sm mt-1">Schedule posts from the composer</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.items.map((post) => (
            <Card key={post._id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Clock className="w-4 h-4 text-purple-500" />
                        {formatDateTime(post.scheduledFor)}
                      </div>
                      <span className="text-xs text-muted-foreground">({formatRelativeTime(post.scheduledFor)})</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-3">{post.content}</p>
                    {post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.hashtags.slice(0, 5).map((h) => (
                          <span key={h} className="text-xs text-primary/70">#{h}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
