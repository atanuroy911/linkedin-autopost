import { Worker, Job } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'
import connectDB from '@/lib/db/connection'
import { Campaign } from '@/lib/db/models/Campaign'
import { GeneratedPost } from '@/lib/db/models/GeneratedPost'
import { PublishedPost } from '@/lib/db/models/PublishedPost'
import { LinkedInAccount } from '@/lib/db/models/LinkedInAccount'
import { AIProviderSettings } from '@/lib/db/models/AIProviderSettings'
import { User } from '@/lib/db/models/User'
import { getQueue, getRedisConnection, QUEUES } from './queues'
import type { CampaignRunnerJobData } from './queues'
import { createAIProvider } from '@/lib/ai'
import { safeDecrypt } from '@/lib/encryption'
import { publishToLinkedIn } from '@/lib/linkedin/publish'
import { sendEmail } from '@/lib/email/mailer'
import type { AIProvider } from '@/types'

export function createCampaignRunnerWorker() {
  const worker = new Worker<CampaignRunnerJobData>(
    QUEUES.CAMPAIGN_RUNNER,
    async (job: Job<CampaignRunnerJobData>) => {
      const { campaignId } = job.data
      console.log(`🎯 Campaign runner: starting job for campaign ${campaignId}`)

      await connectDB()

      // Bail if campaign was paused/deleted since job was enqueued
      const campaign = await Campaign.findById(campaignId)
      if (!campaign || !campaign.isActive) {
        console.log(`⏭ Campaign ${campaignId} is not active — skipping`)
        return
      }

      // Load AI provider
      const aiSettings = await AIProviderSettings.findOne({
        userId: campaign.userId,
        isActive: true,
      })
      if (!aiSettings) {
        console.warn(`⚠ Campaign ${campaignId}: no active AI provider for user ${campaign.userId}`)
        return
      }

      const config = {
        apiKey: aiSettings.apiKey ? (safeDecrypt(aiSettings.apiKey) ?? undefined) : undefined,
        ollamaEndpoint: aiSettings.ollamaEndpoint,
        defaultModel: aiSettings.defaultModel,
        generationSettings: aiSettings.generationSettings,
      }

      const aiClient = createAIProvider(aiSettings.provider as AIProvider, config)

      // ── Build the generation prompt ────────────────────────────────────────
      const topicList = campaign.niche.topics.join(', ') || 'general professional content'
      const keywordList = campaign.niche.keywords.join(', ')
      const styleBlock = campaign.examplePosts.filter(Boolean).length
        ? `\nMatch the writing style of these example posts:\n${campaign.examplePosts
            .filter(Boolean)
            .map((p: string, i: number) => `--- Example ${i + 1} ---\n${p}`)
            .join('\n')}\n`
        : ''

      const prompt = `You are a professional LinkedIn content creator.

Write a single, engaging LinkedIn post for the following campaign:

Industry: ${campaign.niche.industry}
Topics (pick the most relevant one): ${topicList}
Keywords to incorporate: ${keywordList || 'none specified'}
Tone: ${campaign.tone}
${styleBlock}
Requirements:
- 150–280 words
- First person, authentic voice
- Strong opening hook (first line must grab attention)
- Clear insight or value for the reader
- End with a question or call-to-action
- Do NOT add hashtags in the post body

Return a JSON object — no markdown fences, no preamble:
{
  "content": "Full post text here...",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`

      const raw = await aiClient.chat([{ role: 'user', content: prompt }])
      const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
      const generated: { content: string; hashtags: string[] } = JSON.parse(cleaned)

      if (!generated.content) throw new Error('AI returned empty content')

      // ── Route by approval mode ────────────────────────────────────────────
      if (campaign.approvalMode === 'auto') {
        // Publish directly to LinkedIn
        const linkedInAccount = await LinkedInAccount.findOne({
          userId: campaign.userId,
          isConnected: true,
        })
        if (!linkedInAccount) throw new Error(`No connected LinkedIn account for user ${campaign.userId}`)

        const postText = `${generated.content}\n\n${generated.hashtags.map((h) => `#${h}`).join(' ')}`

        const result = await publishToLinkedIn({
          encryptedAccessToken: linkedInAccount.accessToken,
          linkedinUserId: linkedInAccount.linkedinId,
          content: postText,
          postType: 'text',
        })

        const savedPost = await GeneratedPost.create({
          userId: campaign.userId,
          aiProvider: aiSettings.provider,
          modelUsed: aiSettings.defaultModel,
          content: generated.content,
          hashtags: generated.hashtags,
          postType: 'text',
          status: 'published',
          generatedAt: new Date(),
          approvedAt: new Date(),
        })

        await PublishedPost.create({
          userId: campaign.userId,
          generatedPostId: savedPost._id,
          linkedinPostId: result.postId,
          linkedinPostUrl: result.postUrl,
          content: generated.content,
          hashtags: generated.hashtags,
          postType: 'text',
          publishedAt: new Date(),
          publishMethod: 'auto',
        })

        // In-app notification
        const notifQueue = getQueue(QUEUES.NOTIFICATION)
        await notifQueue.add('campaign-auto-published', {
          userId: campaign.userId.toString(),
          type: 'post_published',
          title: `Campaign "${campaign.name}" posted`,
          message: `A post was auto-published to LinkedIn from campaign "${campaign.name}". View it at: ${result.postUrl}`,
          data: { postUrl: result.postUrl, campaignId: campaign._id.toString() },
          sendEmail: false,
        })

        console.log(`✅ Campaign ${campaignId}: auto-published to LinkedIn`)
      } else {
        // Save as pending_approval and email the user
        await GeneratedPost.create({
          userId: campaign.userId,
          aiProvider: aiSettings.provider,
          modelUsed: aiSettings.defaultModel,
          content: generated.content,
          hashtags: generated.hashtags,
          postType: 'text',
          status: 'pending_approval',
          generatedAt: new Date(),
        })

        const user = await User.findById(campaign.userId)
        if (user?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'
          const previewHtml = generated.content.slice(0, 300).replace(/\n/g, '<br>') + (generated.content.length > 300 ? '...' : '')

          await sendEmail({
            to: user.email,
            subject: `Review your LinkedIn post — Campaign: ${campaign.name}`,
            html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #0077B5 0%, #00A0DC 100%); padding: 32px 40px; }
  .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
  .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
  .body { padding: 40px; }
  .campaign-badge { display: inline-block; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; margin-bottom: 20px; }
  .post-preview { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; font-size: 14px; color: #374151; line-height: 1.7; margin-bottom: 28px; }
  .hashtags { color: #0077B5; font-size: 13px; margin-top: 12px; }
  .btn { display: inline-block; background: #0077B5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
  .footer { padding: 24px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
  .footer p { font-size: 12px; color: #9ca3af; margin: 0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>New Post Ready for Review</h1>
    <p>LinkedIn AI Publisher</p>
  </div>
  <div class="body">
    <div class="campaign-badge">📢 ${campaign.name}</div>
    <p style="font-size:15px;color:#111827;margin:0 0 16px;font-weight:600;">Hi ${user.name || 'there'},</p>
    <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">Your campaign generated a new LinkedIn post waiting for your approval:</p>
    <div class="post-preview">
      ${previewHtml}
      <div class="hashtags">${generated.hashtags.map((h) => `#${h}`).join(' ')}</div>
    </div>
    <a href="${appUrl}/drafts" class="btn">Review &amp; Approve Post →</a>
  </div>
  <div class="footer">
    <p>Sent by LinkedIn AI Publisher · <a href="${appUrl}/campaigns">Manage Campaigns</a></p>
  </div>
</div>
</body>
</html>`,
          }).catch((err) => console.error('Campaign approval email failed:', err.message))
        }

        // In-app notification
        const notifQueue = getQueue(QUEUES.NOTIFICATION)
        await notifQueue.add('campaign-needs-approval', {
          userId: campaign.userId.toString(),
          type: 'approval_required',
          title: `Campaign "${campaign.name}" — post needs approval`,
          message: 'A new LinkedIn post is waiting for your review in Drafts.',
          data: { campaignId: campaign._id.toString() },
          sendEmail: false,
        })

        console.log(`📬 Campaign ${campaignId}: saved as pending_approval, email sent`)
      }

      // Update campaign stats
      await Campaign.findByIdAndUpdate(campaignId, {
        lastRunAt: new Date(),
        $inc: { postsGenerated: 1 },
      })
    },
    {
      connection: getRedisConnection() as unknown as ConnectionOptions,
      concurrency: 3,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`❌ Campaign runner job ${job?.id} failed:`, err.message)
  })

  return worker
}
