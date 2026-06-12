import { GoogleGenerativeAI } from '@google/generative-ai'
import type { IAIProviderClient, AIProviderConfig } from './types'
import type { GeneratedContent, TopicIdea, GenerationRequest } from '@/types'

export class GeminiProvider implements IAIProviderClient {
  provider = 'gemini' as const
  private genAI: GoogleGenerativeAI
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
    this.genAI = new GoogleGenerativeAI(config.apiKey!)
  }

  async generatePosts(request: GenerationRequest): Promise<GeneratedContent[]> {
    const model = this.genAI.getGenerativeModel({
      model: this.config.defaultModel || 'gemini-1.5-flash',
      generationConfig: {
        temperature: this.config.generationSettings.temperature,
        maxOutputTokens: this.config.generationSettings.maxTokens * (request.count || 3),
        topP: this.config.generationSettings.topP,
        responseMimeType: 'application/json',
      },
    })

    const prompt = `Generate ${request.count || 3} LinkedIn posts about: "${request.topic}"
Industry: ${request.industry || 'General'}
Keywords: ${request.keywords?.join(', ') || 'none'}
Tone: ${request.tone || 'Professional'}

Return JSON: {"posts": [{"content": "...", "hashtags": ["..."], "postType": "text"}]}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text)
    return parsed.posts || []
  }

  async generateTopicIdeas(industry: string, keywords: string[]): Promise<TopicIdea[]> {
    const model = this.genAI.getGenerativeModel({
      model: this.config.defaultModel || 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2000 },
    })

    const result = await model.generateContent(
      `Generate 10 LinkedIn content topic ideas for ${industry} industry. Keywords: ${keywords.join(', ')}.
Return JSON: {"topics": [{"title": "", "description": "", "keywords": [], "contentPillars": []}]}`
    )

    const text = result.response.text()
    const parsed = JSON.parse(text)
    return parsed.topics || []
  }

  async testConnection(): Promise<{ success: boolean; error?: string; model?: string }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.config.defaultModel || 'gemini-1.5-flash' })
      await model.generateContent('Say ok.')
      return { success: true, model: this.config.defaultModel }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  }

  async listModels(): Promise<string[]> {
    return ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro']
  }

  async chat(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.config.defaultModel || 'gemini-1.5-flash',
      generationConfig: {
        temperature: this.config.generationSettings.temperature,
        maxOutputTokens: 2000,
        topP: this.config.generationSettings.topP,
      },
    })
    
    const contents = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
    
    const systemMessage = messages.find(m => m.role === 'system')?.content
    if (systemMessage && contents.length > 0) {
      contents[0].parts[0].text = `System Prompt: ${systemMessage}\n\nUser: ${contents[0].parts[0].text}`
    }
    
    const result = await model.generateContent({ contents })
    return result.response.text() || ''
  }
}
