import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { LinkedInAccount } from '@/lib/db/models/LinkedInAccount'
import { getLinkedInAuthUrl } from '@/lib/linkedin/oauth'
import crypto from 'crypto'

// GET /api/linkedin/connect — redirects user to LinkedIn OAuth
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Generate state to prevent CSRF
  const state = `${session.user.id}:${crypto.randomBytes(16).toString('hex')}`

  // Store state in cookie
  const response = NextResponse.redirect(getLinkedInAuthUrl(state))
  response.cookies.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    sameSite: 'lax',
  })

  return response
}

// DELETE /api/linkedin/connect — disconnect LinkedIn account
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  await LinkedInAccount.findOneAndUpdate(
    { userId: session.user.id },
    { isConnected: false, disconnectedAt: new Date() }
  )

  return NextResponse.json({ success: true, message: 'LinkedIn account disconnected' })
}
