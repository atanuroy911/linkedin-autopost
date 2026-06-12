/**
 * Worker bootstrap — run this as a separate process:
 * node -r ts-node/register src/workers/index.ts
 * or via the worker Dockerfile
 */
import 'dotenv/config'
import { createContentGenerationWorker } from './contentGeneration'
import { createAutoPublishWorker, createScheduledPublishWorker } from './autoPublish'
import { createNotificationWorker } from './notification'
import { createTokenRefreshWorker } from './tokenRefresh'
import { createCampaignRunnerWorker } from './campaign'
import { getQueue, getRedisConnection, QUEUES } from './queues'
import { setupTerminalLogger } from '../lib/syslogger'

async function main() {
  setupTerminalLogger()
  console.log('🚀 Starting LinkedIn AI Publisher workers...')

  const workers = [
    createContentGenerationWorker(),
    createAutoPublishWorker(),
    createScheduledPublishWorker(),
    createNotificationWorker(),
    createTokenRefreshWorker(),
    createCampaignRunnerWorker(),
  ]

  console.log(`✅ ${workers.length} workers started`)

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n⏳ Shutting down workers...')
    await Promise.all(workers.map((w) => w.close()))
    const conn = getRedisConnection()
    await conn.quit()
    console.log('✅ Workers shut down cleanly')
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('❌ Worker bootstrap failed:', err)
  process.exit(1)
})
