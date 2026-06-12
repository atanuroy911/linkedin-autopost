FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install -g npm@latest
RUN npm approve-scripts --allow-scripts-pending
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Next.js web application
FROM base AS web
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 4000
ENV PORT 4000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

# BullMQ worker process
FROM base AS worker
WORKDIR /app
ENV NODE_ENV production
# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
# Copy all source code
COPY . .

# Run the worker script using tsx directly
CMD ["npx", "tsx", "src/workers/index.ts"]
