import axios from 'axios'
import { decryptToken } from './oauth'
import type { PostType } from '@/types'

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2'
const LINKEDIN_UGC_URL = `${LINKEDIN_API_BASE}/ugcPosts`
const LINKEDIN_ASSETS_URL = `${LINKEDIN_API_BASE}/assets`

interface PublishPostOptions {
  encryptedAccessToken: string
  linkedinUserId: string
  content: string
  postType: PostType
  mediaUrns?: string[]
  externalUrl?: string
}

interface PublishResult {
  postId: string
  postUrl: string
}

export async function publishToLinkedIn(options: PublishPostOptions): Promise<PublishResult> {
  const accessToken = decryptToken(options.encryptedAccessToken)
  const authorUrn = `urn:li:person:${options.linkedinUserId}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  }

  // Build post body based on type
  let shareMedia: object | undefined
  let shareUrl: object | undefined

  if (options.postType === 'link' && options.externalUrl) {
    shareUrl = {
      resolvedUrl: options.externalUrl,
      description: { text: '' },
      title: { text: options.externalUrl },
    }
  }

  const postBody: Record<string, unknown> = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: options.content },
        shareMediaCategory:
          options.postType === 'text'
            ? 'NONE'
            : options.postType === 'image'
              ? 'IMAGE'
              : options.postType === 'video'
                ? 'VIDEO'
                : options.postType === 'link'
                  ? 'ARTICLE'
                  : 'DOCUMENT',
        ...(shareUrl && { media: [{ status: 'READY', originalUrl: options.externalUrl }] }),
        ...(options.mediaUrns &&
          options.mediaUrns.length > 0 && {
            media: options.mediaUrns.map((urn) => ({
              status: 'READY',
              media: urn,
            })),
          }),
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  }

  const response = await axios.post(LINKEDIN_UGC_URL, postBody, { headers })
  const postId = response.headers['x-restli-id'] || response.data.id

  return {
    postId,
    postUrl: `https://www.linkedin.com/feed/update/${postId}`,
  }
}

export async function registerLinkedInMedia(
  encryptedAccessToken: string,
  linkedinUserId: string,
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT'
): Promise<{ uploadUrl: string; asset: string }> {
  const accessToken = decryptToken(encryptedAccessToken)
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  }

  const registerRequest = {
    registerUploadRequest: {
      recipes: [
        `urn:li:digitalmediaRecipe:feedshare-${mediaType.toLowerCase()}`,
      ],
      owner: `urn:li:person:${linkedinUserId}`,
      serviceRelationships: [
        {
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        },
      ],
    },
  }

  const response = await axios.post(
    `${LINKEDIN_ASSETS_URL}?action=registerUpload`,
    registerRequest,
    { headers }
  )

  const value = response.data.value
  return {
    uploadUrl: value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
    asset: value.asset,
  }
}

export async function uploadMediaToLinkedIn(
  uploadUrl: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await axios.put(uploadUrl, buffer, {
    headers: { 'Content-Type': contentType },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  })
}

export async function checkPostExists(encryptedAccessToken: string, postId: string): Promise<boolean> {
  const accessToken = decryptToken(encryptedAccessToken)
  try {
    await axios.get(`${LINKEDIN_UGC_URL}/${encodeURIComponent(postId)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      }
    })
    return true
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return false
    }
    return true
  }
}
