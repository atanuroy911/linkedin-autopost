'use client'
import { useQuery } from '@tanstack/react-query'
import { Terminal, RefreshCw, Loader2, Play, Square } from 'lucide-react'
import { apiRequest } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface LogEntry {
  level: string
  msg: string
  time: number
}

export default function DeveloperTerminalPage() {
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['syslogs'],
    queryFn: () => apiRequest<{ logs: LogEntry[] }>('/api/developer/syslogs'),
    refetchInterval: autoScroll ? 2000 : false,
  })

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [data, autoScroll])

  return (
    <div className="space-y-4 animate-in h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Terminal className="w-8 h-8" /> System Terminal
          </h1>
          <p className="text-muted-foreground mt-1">Live stdout/stderr stream from backend processes</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setAutoScroll(!autoScroll)} 
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${autoScroll ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}
          >
            {autoScroll ? <Play className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {autoScroll ? 'Live' : 'Paused'}
          </button>
          <button onClick={() => refetch()} className="p-2 rounded hover:bg-accent text-muted-foreground">
            <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-zinc-950 rounded-lg shadow-inner overflow-y-auto font-mono text-sm p-4 border border-zinc-800 relative">
        {(!data || data.logs.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            {isRefetching ? <Loader2 className="w-6 h-6 animate-spin mb-2" /> : <Terminal className="w-8 h-8 mb-2 opacity-50" />}
            <p>Waiting for output...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {data.logs.map((log, i) => {
              const timeStr = new Date(log.time).toISOString().split('T')[1].slice(0, 12)
              let color = 'text-zinc-300'
              if (log.level === 'error') color = 'text-red-400'
              else if (log.level === 'warn') color = 'text-yellow-400'
              else if (log.msg.includes('✅')) color = 'text-emerald-400'
              else if (log.msg.includes('🚀')) color = 'text-blue-400'

              return (
                <div key={i} className="flex gap-4 hover:bg-zinc-900/50 px-2 py-0.5 rounded -mx-2 transition-colors">
                  <span className="text-zinc-500 shrink-0 select-none">[{timeStr}]</span>
                  <span className={`${color} break-all whitespace-pre-wrap`}>{log.msg}</span>
                </div>
              )
            })}
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>
    </div>
  )
}
