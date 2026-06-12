'use client'
import { useQuery } from '@tanstack/react-query'
import { ScrollText, Loader2, Search, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { apiRequest, formatDateTime } from '@/lib/utils'

interface ActivityLog {
  _id: string
  action: string
  resourceType: string
  resourceId?: string
  metadata?: Record<string, unknown>
  createdAt: string
  userId?: { name: string; email: string }
}

const ACTION_COLORS: Record<string, string> = {
  'user.created': 'text-emerald-500',
  'user.updated': 'text-blue-500',
  'user.deleted': 'text-red-500',
}

export default function AdminLogsPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', search],
    queryFn: () => apiRequest<{ items: ActivityLog[]; total: number }>(
      `/api/admin/logs${search ? `?action=${search}` : ''}`
    ),
    refetchInterval: 10000,
  })

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">Audit trail of all system actions</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Filter by action..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.items.map((log) => (
            <Card key={log._id} className="hover:border-border transition-colors">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono font-medium ${ACTION_COLORS[log.action] || 'text-foreground'}`}>
                        {log.action}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{log.resourceType}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {log.userId && (
                        <span className="text-xs text-muted-foreground">{(log.userId as { name: string }).name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                    </div>
                  </div>
                  {log.metadata && (
                    <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground max-w-xs truncate hidden md:block">
                      {JSON.stringify(log.metadata)}
                    </code>
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
