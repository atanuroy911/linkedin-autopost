'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Loader2, CheckCheck, Info, AlertCircle, Calendar, Brain, Zap } from 'lucide-react'
import { LinkedInIcon } from '@/components/ui/linkedin-icon'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime, apiRequest } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { NotificationType } from '@/types'

interface Notification {
  _id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  draft_created: Brain,
  approval_required: AlertCircle,
  post_scheduled: Calendar,
  post_published: Zap,
  linkedin_expired: LinkedInIcon,
  ai_generation_failed: AlertCircle,
  auto_publish_warning: Bell,
}

const NOTIFICATION_COLORS: Record<string, string> = {
  draft_created: 'text-blue-500 bg-blue-500/10',
  approval_required: 'text-yellow-500 bg-yellow-500/10',
  post_scheduled: 'text-purple-500 bg-purple-500/10',
  post_published: 'text-emerald-500 bg-emerald-500/10',
  linkedin_expired: 'text-orange-500 bg-orange-500/10',
  ai_generation_failed: 'text-red-500 bg-red-500/10',
  auto_publish_warning: 'text-orange-500 bg-orange-500/10',
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiRequest<{ items: Notification[]; unreadCount: number }>('/api/notifications'),
    refetchInterval: 30000,
  })

  const markAllRead = useMutation({
    mutationFn: () => apiRequest('/api/notifications', { method: 'PATCH', body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
  })

  return (
    <div className="space-y-6 max-w-2xl animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {data?.unreadCount ? `${data.unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {data && data.unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.items.map((notification) => {
            const Icon = NOTIFICATION_ICONS[notification.type] || Bell
            const color = NOTIFICATION_COLORS[notification.type] || 'text-primary bg-primary/10'

            return (
              <Card
                key={notification._id}
                className={cn('transition-colors', !notification.isRead && 'border-primary/30 bg-primary/5')}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{notification.title}</p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{formatRelativeTime(notification.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
