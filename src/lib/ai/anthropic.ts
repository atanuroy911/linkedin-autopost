import Anthropic from '@anthropic-ai/sdk'
import type { IAIProviderClient, AIProviderConfig } from './types'
import type { GeneratedContent, TopicIdea, GenerationRequest } from '@/types'

const LINKEDIN_POST_SYSTEM_PROMPT = `You are an expert LinkedIn content creator. Generate engaging, professional LinkedIn posts.
Always return valid JSON with structure: {"posts": [{"content": "...", "hashtags": ["..."], "postType": "text"}]}`

export class AnthropicProvider implements IAIProviderClient {
  provider = 'claude' as const
  private client: Anthropic
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
    this.client = new Anthropic({ apiKey: config.apiKey })
  }

  async generatePosts(request: GenerationRequest): Promise<GeneratedContent[]> {
    const userPrompt = `Generate ${request.count || 3} LinkedIn posts about: "${request.topic}"
Industry: ${request.industry || 'General'}
Keywords: ${request.keywords?.join(', ') || 'none'}
Content Pillars: ${request.contentPillars?.join(', ') || 'none'}
Tone: ${request.tone || 'Professional'}
Return only valid JSON.`

    const response = await this.client.messages.create({
      model: this.config.defaultModel || 'claude-3-5-haiku-20241022',
      max_tokens: this.config.generationSettings.maxTokens * (request.count || 3),
      system: this.config.generationSettings.systemPrompt || LINKEDIN_POST_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: this.config.generationSettings.temperature,
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.posts || []
  }

  async generateTopicIdeas(industry: string, keywords: string[]): Promise<TopicIdea[]> {
    const response = await this.client.messages.create({
      model: this.config.defaultModel || 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      system: 'Generate LinkedIn topic ideas as JSON: {"topics": [{"title": "", "description": "", "keywords": [], "contentPillars": []}]}',
      messages: [{
        role: 'user',
        content: `Generate 10 LinkedIn content topic ideas for the ${industry} industry. Keywords: ${keywords.join(', ')}. Return only JSON.`,
      }],
    })

    const content = response.content[0]
    if (content.type !== 'text') return []
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.topics || []
  }

  async testConnection(): Promise<{ success: boolean; error?: string; model?: string }> {
    try {
      await this.client.messages.create({
        model: this.config.defaultModel || 'claude-3-5-haiku-20241022',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Say ok.' }],
      })
      return { success: true, model: this.config.defaultModel }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  }

  async listModels(): Promise<string[]> {
    return [
      'claude-opus-4-5',
      'claude-sonnet-4-5',
      'claude-haiku-4-5',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ]
  }

  async chat(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
    const systemMessage = messages.find(m => m.role === 'system')?.content
    const userMessages = messages.filter(m => m.role !== 'system') as any[]

    const response = await this.client.messages.create({
      model: this.config.defaultModel || 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      system: systemMessage,
      messages: userMessages,
      temperature: this.config.generationSettings.temperature,
    })
    
    const content = response.content[0]
    return content.type === 'text' ? content.text : ''
  }
}
