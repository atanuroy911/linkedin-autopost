import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import type { PostStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: Date | string, fmt = 'MMM d, yyyy'): string {
  return format(new Date(date), fmt)
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy · h:mm a')
}

export function getStatusColor(status: PostStatus): string {
  const map: Record<PostStatus, string> = {
    draft: 'status-draft',
    pending_approval: 'status-pending_approval',
    approved: 'status-approved',
    scheduled: 'status-scheduled',
    published: 'status-published',
    rejected: 'status-rejected',
  }
  return map[status] || 'status-draft'
}

export function getStatusLabel(status: PostStatus): string {
  const map: Record<PostStatus, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    scheduled: 'Scheduled',
    published: 'Published',
    rejected: 'Rejected',
  }
  return map[status] || status
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getProviderLabel(provider: string): string {
  const map: Record<string, string> = {
    openai: 'OpenAI',
    claude: 'Anthropic Claude',
    gemini: 'Google Gemini',
    ollama: 'Ollama (Local)',
    openrouter: 'OpenRouter',
  }
  return map[provider] || provider
}

export function getProviderColor(provider: string): string {
  const map: Record<string, string> = {
    openai: 'text-emerald-500',
    claude: 'text-orange-500',
    gemini: 'text-blue-500',
    ollama: 'text-purple-500',
    openrouter: 'text-pink-500',
  }
  return map[provider] || 'text-primary'
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}
