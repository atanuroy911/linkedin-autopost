import type { IAIProviderClient, AIProviderConfig } from './types'
import type { AIProvider } from '@/types'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { GeminiProvider } from './gemini'
import { OllamaProvider } from './ollama'
import { OpenRouterProvider } from './openrouter'

export function createAIProvider(
  provider: AIProvider,
  config: AIProviderConfig
): IAIProviderClient {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(config)
    case 'claude':
      return new AnthropicProvider(config)
    case 'gemini':
      return new GeminiProvider(config)
    case 'ollama':
      return new OllamaProvider(config)
    case 'openrouter':
      return new OpenRouterProvider(config)
    default:
      throw new Error(`Unsupported AI provider: ${provider}`)
  }
}

export { OpenAIProvider } from './openai'
export { AnthropicProvider } from './anthropic'
export { GeminiProvider } from './gemini'
export { OllamaProvider } from './ollama'
export { OpenRouterProvider } from './openrouter'
export type { IAIProviderClient, AIProviderConfig } from './types'
