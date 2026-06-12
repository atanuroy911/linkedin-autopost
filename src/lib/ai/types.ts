import type { GeneratedContent, TopicIdea, GenerationRequest, AIProvider } from '@/types'

export interface AIProviderConfig {
  apiKey?: string
  ollamaEndpoint?: string
  openrouterBaseUrl?: string
  defaultModel: string
  generationSettings: {
    temperature: number
    maxTokens: number
    topP: number
    systemPrompt?: string
  }
}

export interface IAIProviderClient {
  provider: AIProvider
  generatePosts(request: GenerationRequest): Promise<GeneratedContent[]>
  generateTopicIdeas(industry: string, keywords: string[]): Promise<TopicIdea[]>
  testConnection(): Promise<{ success: boolean; error?: string; model?: string }>
  listModels(): Promise<string[]>
  chat(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string>
}
