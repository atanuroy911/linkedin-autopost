import nodemailer from 'nodemailer'
import type { NotificationType } from '@/types'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

const isEnabled = process.env.SMTP_ENABLED === 'true'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  return transporter
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!isEnabled) {
    console.log(`[Email stub] To: ${options.to} | Subject: ${options.subject}`)
    return
  }

  const t = getTransporter()
  await t.sendMail({
    from: process.env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })
}

export function getEmailTemplate(
  type: NotificationType,
  data: {
    userName: string
    title: string
    message: string
    actionUrl?: string
    actionLabel?: string
  }
): string {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'LinkedIn AI Publisher'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>${data.title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #0077B5 0%, #00A0DC 100%); padding: 32px 40px; }
  .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
  .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
  .body { padding: 40px; }
  .greeting { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; }
  .message { font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 32px; }
  .btn { display: inline-block; background: #0077B5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; }
  .footer { padding: 24px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
  .footer p { font-size: 12px; color: #9ca3af; margin: 0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${appName}</h1>
    <p>LinkedIn Content Automation</p>
  </div>
  <div class="body">
    <div class="greeting">Hello, ${data.userName}!</div>
    <div class="message">${data.message}</div>
    ${data.actionUrl ? `<a href="${data.actionUrl}" class="btn">${data.actionLabel || 'Take Action'}</a>` : ''}
  </div>
  <div class="footer">
    <p>This email was sent by ${appName}. <a href="${appUrl}">Visit app</a></p>
  </div>
</div>
</body>
</html>`
}
