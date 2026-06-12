<div align="center">

<img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/MongoDB-7-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
<img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
<img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
<img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License">

<br /><br />

<h1>🔗 LinkedIn AI Publisher</h1>

<p><strong>Self-hosted, AI-powered LinkedIn content automation platform.</strong><br/>
Generate, schedule, and publish professional LinkedIn posts — with full control over your data, AI provider, and posting workflow.</p>

<a href="https://atanuroy911.github.io/linkedin-autopost/">📘 Documentation</a> &nbsp;·&nbsp;
<a href="#-quick-start">Quick Start</a> &nbsp;·&nbsp;
<a href="#-features">Features</a> &nbsp;·&nbsp;
<a href="#%EF%B8%8F-configuration">Configuration</a>

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| **💡 Content Discovery** | Paste any text — AI extracts 6 unique LinkedIn post angles |
| **📖 I Read** | Paste an article you've read; get 3 complete posts in your voice |
| **🎯 Campaigns** | Define a niche + schedule → AI auto-generates and publishes on autopilot |
| **✉️ Email Approval** | Review every campaign post before it goes live |
| **📅 Scheduling** | Schedule any post to a specific date & time |
| **🤖 Multi-Provider AI** | OpenAI, Anthropic Claude, Google Gemini, Ollama (local), OpenRouter |
| **🔒 Self-Hosted** | Your data, your server. API keys encrypted with AES-256-GCM |
| **🛠️ Developer Mode** | Real-time system logs + BullMQ job queue monitor |
| **🛡️ Admin Panel** | User management, platform stats, activity audit logs |

---

## 🏗️ Architecture

```
Browser → Nginx → Next.js (Port 4000)
                      │
          ┌───────────┼───────────┐
          │           │           │
       MongoDB      Redis     LinkedIn API
                      │
               BullMQ Worker
               ├── content-generation
               ├── campaign-runner (cron)
               ├── auto-publish
               ├── scheduled-publish
               ├── notification
               └── token-refresh
```

**Tech Stack:** Next.js 16 (App Router) · TypeScript · MongoDB (Mongoose) · Redis + BullMQ · NextAuth.js · Nodemailer · Docker Compose

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 20, npm ≥ 10
- Docker + Docker Compose
- MongoDB (local or [Atlas](https://cloud.mongodb.com))
- Redis (local — included in Docker Compose)
- [LinkedIn Developer App](https://www.linkedin.com/developers/apps)

### 1. Clone & Install

```bash
git clone https://github.com/atanuroy911/linkedin-autopost.git
cd linkedin-autopost
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.production
```

Fill in the required values (see [Configuration](#%EF%B8%8F-configuration) below).

### 3. Generate Secrets

```bash
# NextAuth secret (min 32 chars)
openssl rand -base64 32

# Encryption key for API key storage (must be exactly 64 hex chars)
openssl rand -hex 32
```

### 4. Deploy with Docker

```bash
chmod +x deploy.sh
./deploy.sh
```

The app starts at **http://localhost:4000** and the BullMQ worker starts alongside it.

### 5. Seed Admin Account

```bash
docker exec linkedin-autopost-web npm run seed
```

### 6. Connect LinkedIn

Log in → **Settings → LinkedIn** → Connect your account via OAuth.

### 7. Configure an AI Provider

Log in → **Settings → AI Provider** → Select provider, enter API key.

---

## ⚙️ Configuration

All config is via environment variables. Copy `.env.example` to `.env.production`.

### Required Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public URL of the app (e.g. `https://yourdomain.com`) |
| `NEXTAUTH_URL` | Same as `NEXT_PUBLIC_APP_URL` |
| `NEXTAUTH_SECRET` | Random string ≥ 32 chars (`openssl rand -base64 32`) |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis URL (e.g. `redis://localhost:6379`) |
| `LINKEDIN_CLIENT_ID` | LinkedIn Developer App → Auth tab |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn Developer App → Auth tab |
| `LINKEDIN_REDIRECT_URI` | `{APP_URL}/api/linkedin/callback` |
| `ENCRYPTION_KEY` | 64-char hex string (`openssl rand -hex 32`) |
| `ADMIN_EMAIL` | Initial admin account email (used by `npm run seed`) |
| `ADMIN_PASSWORD` | Initial admin password |

### Email / SMTP (Optional)

```env
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # Gmail App Password
SMTP_FROM="LinkedIn AI Publisher <noreply@example.com>"
```

Set `SMTP_ENABLED=false` to use in-app notifications only.

### AI Provider Keys (Optional Global Fallbacks)

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434
OPENROUTER_API_KEY=sk-or-...
```

> Users configure their own keys per-account in Settings. These are optional server-level fallbacks only.

---

## 🎯 Campaigns

Campaigns are the core auto-posting engine:

1. **Create** — Name, niche (industry + topics + keywords), tone, optional style examples
2. **Schedule** — Weekly (Mon/Wed/Fri…) or Monthly (1st, 15th…), time, timezone
3. **Approval mode** — `Auto-post` (straight to LinkedIn) or `Email approval` (review in Drafts first)
4. **Activate** → BullMQ registers a cron job; posts generate on schedule automatically

> ⚠️ **Niche is locked after creation.** Delete and recreate to change industry/topics.

---

## 📖 I Read

Paste any article → get 3 complete LinkedIn posts from 3 angles:
- 🔵 **Key Insight** — The most important takeaway
- 🟢 **Practical Application** — How to apply it
- 🟡 **My Nuanced Take** — Your perspective and critique

Posts are saved directly to Drafts. No queue — instant.

---

## 🤖 Supported AI Providers

| Provider | Models | Setup |
|---|---|---|
| **OpenAI** | GPT-4o, GPT-4-turbo, GPT-3.5 | API Key |
| **Anthropic Claude** | Claude 3.5 Sonnet, Claude 3 Haiku/Opus | API Key |
| **Google Gemini** | Gemini 1.5 Pro, Gemini Flash | API Key |
| **Ollama** | Any local model (Llama 3, Mistral, Phi…) | Base URL |
| **OpenRouter** | 100+ models | API Key |

Available models are fetched automatically — no manual entry required.

---

## 🐳 Docker Services

```yaml
linkedin-autopost-web     # Next.js app on port 4000
linkedin-autopost-worker  # BullMQ background job processor
linkedin-autopost-mongo   # MongoDB (port 27017)
linkedin-autopost-redis   # Redis (port 6379)
```

### Useful Commands

```bash
# View logs
docker logs linkedin-autopost-web -f
docker logs linkedin-autopost-worker -f

# Restart after code changes
./deploy.sh

# Backup MongoDB
docker exec linkedin-autopost-mongo \
  mongodump --db linkedin-autopost --out /data/backup
docker cp linkedin-autopost-mongo:/data/backup ./mongo-backup-$(date +%Y%m%d)
```

---

## 🔒 Security

- **Session auth** via NextAuth.js (HTTP-only cookies, bcrypt passwords)
- **AES-256-GCM encryption** for all stored API keys and LinkedIn tokens
- **Unique IV per ciphertext** — rotating is safe, key loss is not
- **Role-based access** — `user` vs `admin` enforced on every API route
- **Data isolation** — all DB queries scoped to session `userId`

> ⚠️ Back up your `ENCRYPTION_KEY`. Losing it makes all stored tokens unrecoverable.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (dashboard)/        # All authenticated pages
│   │   ├── campaigns/      # Campaign management
│   │   ├── content/        # Content Discovery + I Read
│   │   ├── drafts/         # Draft approval queue
│   │   ├── settings/       # User + AI + LinkedIn settings
│   │   └── developer/      # System logs + job queues
│   └── api/                # Next.js API route handlers
├── lib/
│   ├── ai/                 # AI provider clients (factory pattern)
│   ├── db/models/          # Mongoose schemas
│   ├── email/              # Nodemailer integration
│   ├── linkedin/           # OAuth + publishing
│   └── encryption.ts       # AES-256-GCM helpers
└── workers/
    ├── campaign.ts         # Campaign cron runner
    ├── autoPublish.ts      # Auto + scheduled publishing
    ├── contentGeneration.ts
    ├── notification.ts
    └── tokenRefresh.ts
```

---

## 📘 Documentation

Full documentation is in the [`docs/`](./docs/) folder (GitHub Pages ready):

| Page | Contents |
|---|---|
| [Overview](./docs/index.html) | What is it, architecture, quick start |
| [Installation](./docs/installation.html) | Prerequisites, LinkedIn OAuth, database setup |
| [Configuration](./docs/configuration.html) | All environment variables |
| [Features](./docs/features.html) | Content Discovery, I Read, Campaigns, Drafts |
| [API Reference](./docs/api.html) | All REST endpoints |
| [Deployment](./docs/deployment.html) | Docker, Nginx, SSL, backup |
| [Architecture](./docs/architecture.html) | System design, workers, data models, security |

> Enable GitHub Pages from **Settings → Pages → Source: `main` branch, `/docs` folder** to host the docs publicly.

---

## 🗺️ Roadmap

- [ ] LinkedIn analytics integration (impressions, reactions, comments)
- [ ] Team/multi-user workspaces
- [ ] Post templates library
- [ ] AI-powered hashtag research
- [ ] Webhook support for post events
- [ ] Mobile-responsive improvements

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">
  <sub>Built with ❤️ using Next.js, MongoDB, BullMQ, and various AI providers.</sub>
</div>
