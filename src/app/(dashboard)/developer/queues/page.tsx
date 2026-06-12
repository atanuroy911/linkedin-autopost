'use client'
import { useQuery } from '@tanstack/react-query'
import { Activity, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiRequest } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface QueueJob {
  id: string
  name: string
  status: string
  data: any
  failedReason?: string
  timestamp: number
}

interface QueueStats {
  name: string
  active: number
  waiting: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
  jobs: QueueJob[]
}

export default function DeveloperQueuesPage() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['developer-queues'],
    queryFn: () => apiRequest<{ queues: QueueStats[] }>('/api/developer/queues'),
    refetchInterval: 5000,
  })

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Queues</h1>
          <p className="text-muted-foreground mt-1">Real-time status of background workers</p>
        </div>
        <button onClick={() => refetch()} className="p-2 rounded hover:bg-accent text-muted-foreground">
          <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading && !data ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : data?.queues.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No queues found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {data?.queues.map((q) => (
            <Card key={q.name} className="flex flex-col">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">{q.name}</CardTitle>
                  {q.paused && <Badge variant="destructive">Paused</Badge>}
                </div>
                <div className="flex gap-4 mt-2">
                  <Stat label="Waiting" value={q.waiting} color="text-yellow-600" />
                  <Stat label="Active" value={q.active} color="text-blue-600" />
                  <Stat label="Delayed" value={q.delayed} color="text-purple-600" />
                  <Stat label="Failed" value={q.failed} color="text-red-600" />
                  <Stat label="Completed" value={q.completed} color="text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                {q.jobs.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">No recent active jobs</div>
                ) : (
                  <div className="divide-y divide-border">
                    {q.jobs.map((job) => (
                      <div key={job.id} className="p-4 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">{job.name} <span className="text-muted-foreground font-normal text-xs ml-1">#{job.id}</span></span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            job.status === 'failed' ? 'bg-red-100 text-red-700' :
                            job.status === 'active' ? 'bg-blue-100 text-blue-700' :
                            job.status === 'delayed' ? 'bg-purple-100 text-purple-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        {job.failedReason && (
                          <p className="text-xs text-red-600 mt-1 line-clamp-2">{job.failedReason}</p>
                        )}
                        <pre className="text-[10px] mt-2 bg-muted p-2 rounded text-muted-foreground overflow-x-auto">
                          {JSON.stringify(job.data, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-lg font-semibold ${color}`}>{value}</span>
    </div>
  )
}
