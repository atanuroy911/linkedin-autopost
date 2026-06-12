import OpenAI from 'openai'
import type { IAIProviderClient, AIProviderConfig } from './types'
import type { GeneratedContent, TopicIdea, GenerationRequest } from '@/types'

// OpenRouter uses the OpenAI-compatible API
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

const SYSTEM_PROMPT = `You are an expert LinkedIn content creator. Return valid JSON only.
Format: {"posts": [{"content": "...", "hashtags": ["..."], "postType": "text"}]}`

export class OpenRouterProvider implements IAIProviderClient {
  provider = 'openrouter' as const
  private client: OpenAI
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.openrouterBaseUrl || OPENROUTER_BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': process.env.NEXT_PUBLIC_APP_NAME || 'LinkedIn AI Publisher',
      },
    })
  }

  async generatePosts(request: GenerationRequest): Promise<GeneratedContent[]> {
    const response = await this.client.chat.completions.create({
      model: this.config.defaultModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Generate ${request.count || 3} LinkedIn posts about: "${request.topic}". Industry: ${request.industry || 'General'}. Keywords: ${request.keywords?.join(', ')}`,
        },
      ],
      temperature: this.config.generationSettings.temperature,
      max_tokens: this.config.generationSettings.maxTokens * (request.count || 3),
      top_p: this.config.generationSettings.topP,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No content generated')
    const parsed = JSON.parse(content)
    return parsed.posts || []
  }

  async generateTopicIdeas(industry: string, keywords: string[]): Promise<TopicIdea[]> {
    const response = await this.client.chat.completions.create({
      model: this.config.defaultModel,
      messages: [{
        role: 'user',
        content: `Generate 10 LinkedIn topic ideas for ${industry}. Keywords: ${keywords.join(', ')}. Return JSON: {"topics": [{"title": "", "description": "", "keywords": [], "contentPillars": []}]}`,
      }],
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return []
    const parsed = JSON.parse(content)
    return parsed.topics || []
  }

  async testConnection(): Promise<{ success: boolean; error?: string; model?: string }> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.defaultModel,
        messages: [{ role: 'user', content: 'Say ok.' }],
        max_tokens: 5,
      })
      return { success: true, model: response.model }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  }

  async listModels(): Promise<string[]> {
    return [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3.5-haiku',
      'google/gemini-flash-1.5',
      'meta-llama/llama-3.3-70b-instruct',
      'mistralai/mistral-nemo',
      'deepseek/deepseek-chat',
    ]
  }

  async chat(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.config.defaultModel,
      messages,
      temperature: this.config.generationSettings.temperature,
      max_tokens: 2000,
      top_p: this.config.generationSettings.topP,
    })
    return response.choices[0]?.message?.content || ''
  }
}
