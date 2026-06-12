import axios from 'axios'
import { encrypt, decrypt } from '@/lib/encryption'

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
const LINKEDIN_PROFILE_URL = 'https://api.linkedin.com/v2/userinfo'

const SCOPES = ['openid', 'profile', 'email', 'w_member_social']

export function getLinkedInAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
    state,
    scope: SCOPES.join(' '),
  })
  return `${LINKEDIN_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string
  expiresIn: number
  refreshToken?: string
}> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  })

  const response = await axios.post(LINKEDIN_TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in,
    refreshToken: response.data.refresh_token,
  }
}

export async function refreshAccessToken(encryptedRefreshToken: string): Promise<{
  accessToken: string
  expiresIn: number
}> {
  const refreshToken = decrypt(encryptedRefreshToken)

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  })

  const response = await axios.post(LINKEDIN_TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in,
  }
}

export async function getLinkedInProfile(accessToken: string): Promise<{
  id: string
  name: string
  email: string
  picture?: string
  profileUrl?: string
}> {
  const response = await axios.get(LINKEDIN_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  return {
    id: response.data.sub,
    name: response.data.name,
    email: response.data.email,
    picture: response.data.picture,
    profileUrl: `https://www.linkedin.com/in/${response.data.sub}`,
  }
}

export function encryptToken(token: string): string {
  return encrypt(token)
}

export function decryptToken(encryptedToken: string): string {
  return decrypt(encryptedToken)
}
