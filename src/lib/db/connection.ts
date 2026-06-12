import mongoose from 'mongoose'
// syslogger is lazy-initialized to avoid circular imports
let sysloggerInit = false

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Extend global type for hot-reload caching in dev
// In Cloudflare Workers, globalThis persists across requests within the same isolate
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache
}

const cached: MongooseCache = globalThis.mongoose || { conn: null, promise: null }

if (!globalThis.mongoose) {
  globalThis.mongoose = cached
}

/**
 * Serverless-safe Mongoose connection.
 *
 * Works across:
 *  - Next.js dev (hot-reload safe via globalThis cache)
 *  - Node.js production (next start)
 *  - Cloudflare Workers via @opennextjs/cloudflare + nodejs_compat flag
 *
 * For Cloudflare Workers: MONGODB_URI must point to MongoDB Atlas (not localhost).
 * Set via: wrangler secret put MONGODB_URI
 */
async function connectDB(): Promise<typeof mongoose> {
  // Safe to call multiple times, it prevents double interception
  if (typeof window === 'undefined' && !sysloggerInit) {
    sysloggerInit = true
    import('../syslogger').then(({ setupTerminalLogger }) => setupTerminalLogger()).catch(() => {})
  }

  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set. Add it to .env.local or via `wrangler secret put MONGODB_URI`.')
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      // Serverless-optimised timeouts — fail fast rather than hanging a Worker request
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      // Keep connection pool small for serverless (Workers share the isolate)
      maxPoolSize: 5,
      minPoolSize: 0,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('✅ MongoDB connected')
      return mongooseInstance
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    // Reset on error so the next request retries the connection
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectDB
