import { conversationRepository } from '../repositories/conversation.repository.js'
import { messageRepository } from '../repositories/message.repository.js'
import { aiService } from './ai.service.js'
import { buildSystemPrompt } from '../ai/prompts.js'
import { loadAgenda, isComplete } from '../onboarding/flow.js'
import type { CollectedData } from '../onboarding/schema.js'

const COMPLETED_MESSAGE = 'Tu configuración ya está completa. Si necesitás hacer cambios, usá /reiniciar para empezar de nuevo.'

const AFFIRMATIVE_RE = /\b(sí|si|dale|perfecto|ok|está bien|todo bien|confirmo|correcto|listo)\b/i

class OnboardingService {
  async handleMessage(telegramChatId: string, userMessage: string): Promise<{ response: string }> {
    // Find or create conversation
    let conversation = await conversationRepository.findByTelegramChatId(telegramChatId)
    if (!conversation) {
      conversation = await conversationRepository.create(telegramChatId)
    }

    // Short-circuit if completed
    if (conversation.status === 'completed') {
      return { response: COMPLETED_MESSAGE }
    }

    // Parse state
    const collectedData: CollectedData = JSON.parse(conversation.collectedData)
    const agenda = loadAgenda()
    const systemPrompt = buildSystemPrompt(agenda, collectedData, conversation.status)

    // Load history + save user message
    const history = await messageRepository.findByConversationId(conversation.id)
    await messageRepository.create(conversation.id, 'user', userMessage)

    // Call Claude
    const assistantText = await aiService.chat(systemPrompt, history, userMessage)
    await messageRepository.create(conversation.id, 'assistant', assistantText)

    // Extraction — skip on first turn (no history yet)
    if (history.length > 0) {
      const updatedData = await aiService.extract(userMessage, assistantText, agenda, collectedData)
      const dataChanged = JSON.stringify(updatedData) !== JSON.stringify(collectedData)

      if (conversation.status === 'active') {
        if (dataChanged) {
          const newStatus = isComplete(agenda, updatedData) ? 'reviewing' : 'active'
          await conversationRepository.updateData(conversation.id, JSON.stringify(updatedData), newStatus)
        }
      } else if (conversation.status === 'reviewing') {
        if (dataChanged) {
          await conversationRepository.updateData(conversation.id, JSON.stringify(updatedData))
        } else if (AFFIRMATIVE_RE.test(userMessage)) {
          await conversationRepository.updateStatus(conversation.id, 'completed')
        }
      }
    }

    return { response: assistantText }
  }

  async resetConversation(telegramChatId: string) {
    const conversation = await conversationRepository.findByTelegramChatId(telegramChatId)
    if (!conversation) return

    await messageRepository.deleteByConversationId(conversation.id)
    await conversationRepository.reset(conversation.id)
  }

  async startConversation(telegramChatId: string) {
    const conversation = await conversationRepository.findByTelegramChatId(telegramChatId)
    if (!conversation) {
      await conversationRepository.create(telegramChatId)
      return
    }

    if (conversation.status === 'completed') {
      await messageRepository.deleteByConversationId(conversation.id)
      await conversationRepository.reset(conversation.id)
    }
  }
}

export const onboardingService = new OnboardingService()
