import { getRedisConnection } from '@/workers/queues'
import util from 'util'

let initialized = false

export function setupTerminalLogger() {
  if (initialized) return
  initialized = true

  const redis = getRedisConnection()
  
  // We don't want to break the original console
  const origLog = console.log
  const origError = console.error
  const origWarn = console.warn
  const origInfo = console.info

  function pushLog(level: string, args: any[]) {
    try {
      const msg = util.format(...args)
      const logEntry = JSON.stringify({ level, msg, time: Date.now() })
      
      // Fire and forget to Redis
      redis.lpush('system:terminal:logs', logEntry).catch(() => {})
      // Keep only last 1000 logs
      redis.ltrim('system:terminal:logs', 0, 999).catch(() => {})
    } catch (e) {
      // Ignore stringify errors
    }
  }

  console.log = (...args) => {
    origLog(...args)
    pushLog('info', args)
  }

  console.info = (...args) => {
    origInfo(...args)
    pushLog('info', args)
  }

  console.warn = (...args) => {
    origWarn(...args)
    pushLog('warn', args)
  }

  console.error = (...args) => {
    origError(...args)
    pushLog('error', args)
  }
}
