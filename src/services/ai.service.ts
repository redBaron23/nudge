import { anthropic } from '../ai/client.js'
import type { CollectedData } from '../onboarding/schema.js'

interface AIResponse {
  message: string
  extractedData: CollectedData | null
  isComplete: boolean
}

class AIService {
  async respond(systemPrompt: string, history: { role: string; content: string }[], userMessage: string): Promise<AIResponse> {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [...history, { role: 'user', content: userMessage }] as { role: 'user' | 'assistant'; content: string }[],
    })

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('')

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return { message: text, extractedData: null, isComplete: false }

      const parsed = JSON.parse(jsonMatch[0])
      return {
        message: parsed.message ?? text,
        extractedData: parsed.extractedData ?? null,
        isComplete: parsed.isComplete ?? false,
      }
    } catch {
      return { message: text, extractedData: null, isComplete: false }
    }
  }
}

export const aiService = new AIService()
