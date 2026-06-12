import axios from 'axios'
import type { IAIProviderClient, AIProviderConfig } from './types'
import type { GeneratedContent, TopicIdea, GenerationRequest } from '@/types'

const SYSTEM_PROMPT = `You are an expert LinkedIn content creator. Generate posts and return valid JSON only.`

export class OllamaProvider implements IAIProviderClient {
  provider = 'ollama' as const
  private baseUrl: string
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
    this.baseUrl = config.ollamaEndpoint || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  }

  private async _chat(messages: Array<{ role: string; content: string }>, maxTokens: number, isJson = true) {
    const response = await axios.post(`${this.baseUrl}/api/chat`, {
      model: this.config.defaultModel,
      messages,
      stream: false,
      options: {
        temperature: this.config.generationSettings.temperature,
        num_predict: maxTokens,
        top_p: this.config.generationSettings.topP,
      },
      format: isJson ? 'json' : undefined,
    })
    return response.data.message?.content || ''
  }

  async chat(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
    return this._chat(messages, 2000, false)
  }

  async generatePosts(request: GenerationRequest): Promise<GeneratedContent[]> {
    const content = await this._chat([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Generate ${request.count || 3} LinkedIn posts about: "${request.topic}". Industry: ${request.industry || 'General'}. Keywords: ${request.keywords?.join(', ') || 'none'}. Return JSON: {"posts": [{"content": "...", "hashtags": ["..."], "postType": "text"}]}`,
      },
    ], this.config.generationSettings.maxTokens * (request.count || 3))

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.posts || []
  }

  async generateTopicIdeas(industry: string, keywords: string[]): Promise<TopicIdea[]> {
    const content = await this._chat([
      {
        role: 'user',
        content: `Generate 10 LinkedIn topic ideas for ${industry}. Keywords: ${keywords.join(', ')}. Return JSON: {"topics": [{"title": "", "description": "", "keywords": [], "contentPillars": []}]}`,
      },
    ], 2000)

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.topics || []
  }

  async testConnection(): Promise<{ success: boolean; error?: string; model?: string }> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`)
      return { success: true, model: this.config.defaultModel }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNREFUSED') {
          return { success: false, error: `Connection refused by ${this.baseUrl}. If using Docker, ensure Ollama is running with OLLAMA_HOST=0.0.0.0` }
        }
        return { success: false, error: err.response?.data?.error || err.message }
      }
      return { success: false, error: (err as Error).message }
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`)
      return response.data.models?.map((m: { name: string }) => m.name) || []
    } catch {
      return []
    }
  }
}
