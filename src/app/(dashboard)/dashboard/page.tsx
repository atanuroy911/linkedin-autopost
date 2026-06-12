'use client'
import { useQuery } from '@tanstack/react-query'
import {
  Brain,
  FileText,
  Clock,
  CheckCircle,
  Calendar,
  Bell,
  TrendingUp,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Plus,
  ExternalLink,
} from 'lucide-react'
import { LinkedInIcon } from '@/components/ui/linkedin-icon'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, formatRelativeTime, getStatusColor, getStatusLabel, getProviderLabel, truncateText } from '@/lib/utils'
import Link from 'next/link'
import { apiRequest } from '@/lib/utils'

interface DashboardData {
  linkedin: { connected: boolean; displayName?: string; avatar?: string; tokenExpiresAt?: string }
  ai: { configured: boolean; provider?: string; model?: string; testStatus?: string }
  stats: {
    draftCount: number
    pendingApprovalCount: number
    scheduledCount: number
    publishedCount: number
    unreadNotifications: number
  }
  recentDrafts: Array<{ _id: string; content: string; status: string; generatedAt: string; aiProvider: string }>
  recentPublished: Array<{ _id: string; content: string; publishedAt: string; linkedinPostUrl?: string }>
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest('/api/dashboard'),
    refetchInterval: 30000,
  })

  if (isLoading) return <DashboardSkeleton />

  const { linkedin, ai, stats, recentDrafts, recentPublished } = data || {
    linkedin: { connected: false },
    ai: { configured: false },
    stats: { draftCount: 0, pendingApprovalCount: 0, scheduledCount: 0, publishedCount: 0, unreadNotifications: 0 },
    recentDrafts: [],
    recentPublished: [],
  }

  const statCards = [
    { label: 'Drafts', value: stats.draftCount, icon: FileText, color: 'text-yellow-500', href: '/drafts?status=draft' },
    { label: 'Pending Review', value: stats.pendingApprovalCount, icon: Clock, color: 'text-blue-500', href: '/drafts?status=pending_approval' },
    { label: 'Scheduled', value: stats.scheduledCount, icon: Calendar, color: 'text-purple-500', href: '/scheduled' },
    { label: 'Published', value: stats.publishedCount, icon: CheckCircle, color: 'text-emerald-500', href: '/published' },
  ]

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your LinkedIn content hub</p>
        </div>
        <Button asChild>
          <Link href="/content">
            <Sparkles className="w-4 h-4" />
            Generate Content
          </Link>
        </Button>
      </div>

      {/* Connection Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LinkedIn Status */}
        <Card className={cn(
          'border-2 transition-colors',
          linkedin.connected ? 'border-blue-500/30 bg-blue-500/5' : 'border-orange-500/30 bg-orange-500/5'
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                linkedin.connected ? 'bg-[#0077B5]' : 'bg-orange-500'
              )}>
                {linkedin.connected ? (
                  <LinkedInIcon className="w-6 h-6 text-white" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">LinkedIn Account</p>
                {linkedin.connected ? (
                  <>
                    <p className="text-sm text-muted-foreground">{linkedin.displayName}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">✓ Connected</p>
                  </>
                ) : (
                  <p className="text-sm text-orange-600 dark:text-orange-400">Not connected</p>
                )}
              </div>
              {!linkedin.connected && (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/settings?tab=linkedin">Connect</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Provider Status */}
        <Card className={cn(
          'border-2 transition-colors',
          ai.configured ? 'border-violet-500/30 bg-violet-500/5' : 'border-orange-500/30 bg-orange-500/5'
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                ai.configured ? 'gradient-primary' : 'bg-orange-500'
              )}>
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">AI Provider</p>
                {ai.configured ? (
                  <>
                    <p className="text-sm text-muted-foreground">{getProviderLabel(ai.provider!)} · {ai.model}</p>
                    <p className={cn('text-xs mt-0.5', ai.testStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-yellow-600 dark:text-yellow-400')}>
                      {ai.testStatus === 'success' ? '✓ Connection verified' : '⚠ Not tested'}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-orange-600 dark:text-orange-400">No AI provider configured</p>
                )}
              </div>
              {!ai.configured && (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/settings?tab=ai">Configure</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:border-primary/50 transition-all duration-200 hover:shadow-md cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={cn('w-5 h-5', stat.color)} />
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Drafts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">Recent Drafts</CardTitle>
              <CardDescription>Posts awaiting your review</CardDescription>
            </div>
            <Button size="sm" variant="ghost" asChild>
              <Link href="/drafts">View all <ArrowRight className="w-3 h-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDrafts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No drafts yet</p>
                <Button size="sm" className="mt-3" asChild>
                  <Link href="/content"><Plus className="w-3 h-3" />Generate content</Link>
                </Button>
              </div>
            ) : (
              recentDrafts.map((post) => (
                <Link key={post._id} href={`/drafts/${post._id}`}>
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2 text-foreground">{truncateText(post.content, 100)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(post.status as any))}>
                          {getStatusLabel(post.status as any)}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(post.generatedAt)}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recently Published */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">Recently Published</CardTitle>
              <CardDescription>Your latest LinkedIn posts</CardDescription>
            </div>
            <Button size="sm" variant="ghost" asChild>
              <Link href="/published">View all <ArrowRight className="w-3 h-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPublished.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No published posts yet</p>
              </div>
            ) : (
              recentPublished.map((post) => (
                <div key={post._id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2 text-foreground">{truncateText(post.content, 100)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(post.publishedAt)}</span>
                      {post.linkedinPostUrl && (
                        <a href={post.linkedinPostUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary flex items-center gap-1 hover:underline">
                          View on LinkedIn <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-12 bg-muted rounded-lg w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-muted rounded-xl" />)}
      </div>
    </div>
  )
}
