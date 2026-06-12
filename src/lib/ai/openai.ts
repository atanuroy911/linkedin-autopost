import OpenAI from 'openai'
import type { IAIProviderClient, AIProviderConfig } from './types'
import type { GeneratedContent, TopicIdea, GenerationRequest } from '@/types'

const LINKEDIN_POST_SYSTEM_PROMPT = `You are an expert LinkedIn content creator. Generate engaging, professional LinkedIn posts that:
- Are optimized for LinkedIn's algorithm
- Include relevant hashtags (5-10)
- Have strong hooks in the first line
- Are between 150-300 words for optimal engagement
- Follow LinkedIn best practices

Return your response as valid JSON with the structure:
{
  "posts": [
    {
      "content": "post text here",
      "hashtags": ["hashtag1", "hashtag2"],
      "postType": "text"
    }
  ]
}`

export class OpenAIProvider implements IAIProviderClient {
  provider = 'openai' as const
  private client: OpenAI
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
    this.client = new OpenAI({ apiKey: config.apiKey })
  }

  async generatePosts(request: GenerationRequest): Promise<GeneratedContent[]> {
    const userPrompt = `Generate ${request.count || 3} LinkedIn posts about: "${request.topic}"
Industry: ${request.industry || 'General'}
Keywords: ${request.keywords?.join(', ') || 'none'}
Content Pillars: ${request.contentPillars?.join(', ') || 'none'}
Tone: ${request.tone || 'Professional'}
Additional instructions: ${request.additionalInstructions || 'none'}`

    const response = await this.client.chat.completions.create({
      model: this.config.defaultModel || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.config.generationSettings.systemPrompt || LINKEDIN_POST_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
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
      model: this.config.defaultModel || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate LinkedIn topic ideas as JSON: {"topics": [{"title": "", "description": "", "keywords": [], "contentPillars": []}]}',
        },
        {
          role: 'user',
          content: `Generate 10 LinkedIn content topic ideas for the ${industry} industry. Keywords: ${keywords.join(', ')}`,
        },
      ],
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
        model: this.config.defaultModel || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "ok" in one word.' }],
        max_tokens: 5,
      })
      return { success: true, model: response.model }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list()
      return models.data
        .filter((m) => m.id.startsWith('gpt'))
        .map((m) => m.id)
        .sort()
    } catch {
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
    }
  }

  async chat(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.config.defaultModel || 'gpt-4o-mini',
      messages,
      temperature: this.config.generationSettings.temperature,
      max_tokens: 2000,
      top_p: this.config.generationSettings.topP,
    })
    return response.choices[0]?.message?.content || ''
  }
}
