import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { LinkedInAccount } from '@/lib/db/models/LinkedInAccount'
import {
  exchangeCodeForToken,
  getLinkedInProfile,
  encryptToken,
} from '@/lib/linkedin/oauth'
import { addSeconds } from 'date-fns'

// GET /api/linkedin/callback — handles OAuth callback from LinkedIn
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${appUrl}/settings?tab=linkedin&error=${error}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?tab=linkedin&error=missing_params`)
  }

  // Validate state from cookie
  const storedState = req.cookies.get('linkedin_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${appUrl}/settings?tab=linkedin&error=invalid_state`)
  }

  // Extract userId from state
  const [userId] = state.split(':')
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/settings?tab=linkedin&error=invalid_state`)
  }

  try {
    // Exchange code for token
    const { accessToken, expiresIn, refreshToken } = await exchangeCodeForToken(code)

    // Get LinkedIn profile
    const profile = await getLinkedInProfile(accessToken)

    await connectDB()

    // Upsert LinkedIn account
    await LinkedInAccount.findOneAndUpdate(
      { userId },
      {
        userId,
        linkedinId: profile.id,
        profileUrl: profile.profileUrl || `https://www.linkedin.com/in/${profile.id}`,
        displayName: profile.name,
        avatar: profile.picture,
        accessToken: encryptToken(accessToken),
        refreshToken: refreshToken ? encryptToken(refreshToken) : undefined,
        tokenExpiresAt: addSeconds(new Date(), expiresIn),
        scope: 'openid profile email w_member_social',
        isConnected: true,
        connectedAt: new Date(),
        disconnectedAt: undefined,
      },
      { upsert: true, new: true }
    )

    const response = NextResponse.redirect(`${appUrl}/settings?tab=linkedin&success=true`)
    // Clear state cookie
    response.cookies.set('linkedin_oauth_state', '', { maxAge: 0 })
    return response
  } catch (err: unknown) {
    console.error('LinkedIn callback error:', err)
    return NextResponse.redirect(`${appUrl}/settings?tab=linkedin&error=callback_failed`)
  }
}
