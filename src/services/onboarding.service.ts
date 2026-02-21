import { conversationRepository, type Channel } from '../repositories/conversation.repository.js'
import { messageRepository } from '../repositories/message.repository.js'
import { aiService } from './ai.service.js'
import { buildSystemPrompt } from '../ai/prompts.js'
import { loadDefinition, isComplete as checkComplete, buildCompletionMessage } from '../onboarding/flow.js'
import { env } from '../config/env.js'
import { webhookService } from './webhook.service.js'
import type { CollectedData } from '../onboarding/schema.js'

class OnboardingService {
  async handleMessage(channel: Channel, externalId: string, userMessage: string): Promise<{ response: string; followUp?: string }> {
    let conversation = await conversationRepository.findByExternalId(channel, externalId)
    if (!conversation) {
      conversation = await conversationRepository.create(channel, externalId)
    }

    const collectedData: CollectedData = JSON.parse(conversation.collectedData)
    const definition = loadDefinition(env.ONBOARDING_DEFINITION)
    const systemPrompt = buildSystemPrompt(definition, collectedData, conversation.status)

    const history = await messageRepository.findByConversationId(conversation.id, 20)
    await messageRepository.create(conversation.id, 'user', userMessage)

    const result = await aiService.respond(systemPrompt, history, userMessage)
    await messageRepository.create(conversation.id, 'assistant', result.message)

    let followUp: string | undefined

    if (result.extractedData) {
      const updatedData = { ...collectedData, ...result.extractedData }

      if (result.isComplete) {
        console.log(`[onboarding] isComplete=true (with extractedData), calling webhook for ${externalId}`)
        await conversationRepository.updateData(conversation.id, JSON.stringify(updatedData), 'completed')
        const webhookResponse = await webhookService.sendCompletedConfig(updatedData, env.ONBOARDING_DEFINITION, conversation.token)
        console.log(`[onboarding] Webhook returned: ${JSON.stringify(webhookResponse)}`)
        console.log(`[onboarding] Building completion message from definition.completion: ${!!definition.completion}`)
        const completionMsg = buildCompletionMessage(definition, webhookResponse)
        followUp = completionMsg ?? undefined
        console.log(`[onboarding] followUp=${followUp ?? '(none)'}`)
      } else if (checkComplete(definition, updatedData)) {
        await conversationRepository.updateData(conversation.id, JSON.stringify(updatedData), 'reviewing')
      } else {
        await conversationRepository.updateData(conversation.id, JSON.stringify(updatedData))
      }
    } else if (result.isComplete) {
      console.log(`[onboarding] isComplete=true (no extractedData), calling webhook for ${externalId}`)
      await conversationRepository.updateStatus(conversation.id, 'completed')
      const webhookResponse = await webhookService.sendCompletedConfig(collectedData, env.ONBOARDING_DEFINITION, conversation.token)
      console.log(`[onboarding] Webhook returned: ${JSON.stringify(webhookResponse)}`)
      console.log(`[onboarding] Building completion message from definition.completion: ${!!definition.completion}`)
      const completionMsg = buildCompletionMessage(definition, webhookResponse)
      followUp = completionMsg ?? undefined
      console.log(`[onboarding] followUp=${followUp ?? '(none)'}`)
    }

    if (followUp) {
      return { response: followUp }
    }
    return { response: result.message }
  }

  async startConversation(channel: Channel, externalId: string): Promise<{ response: string }> {
    let conversation = await conversationRepository.findByExternalId(channel, externalId)

    if (conversation && conversation.status === 'completed') {
      await messageRepository.deleteByConversationId(conversation.id)
      await conversationRepository.reset(conversation.id)
    }

    if (!conversation) {
      conversation = await conversationRepository.create(channel, externalId)
    }

    const definition = loadDefinition(env.ONBOARDING_DEFINITION)
    const systemPrompt = buildSystemPrompt(definition, {}, 'active')

    const result = await aiService.respond(systemPrompt, [], 'Hola, quiero configurar mi negocio')
    await messageRepository.create(conversation.id, 'assistant', result.message)

    return { response: result.message }
  }

  async resetConversation(channel: Channel, externalId: string): Promise<{ response: string }> {
    const conversation = await conversationRepository.findByExternalId(channel, externalId)
    if (!conversation) {
      return this.startConversation(channel, externalId)
    }

    await messageRepository.deleteByConversationId(conversation.id)
    await conversationRepository.reset(conversation.id)

    const definition = loadDefinition(env.ONBOARDING_DEFINITION)
    const systemPrompt = buildSystemPrompt(definition, {}, 'active')

    const result = await aiService.respond(systemPrompt, [], 'Hola, quiero configurar mi negocio de nuevo')
    await messageRepository.create(conversation.id, 'assistant', result.message)

    return { response: result.message }
  }
}

export const onboardingService = new OnboardingService()
