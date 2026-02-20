import { env } from '../config/env.js'
import type { CollectedData } from '../onboarding/schema.js'

class WebhookService {
  async sendCompletedConfig(conversationId: string, collectedData: CollectedData, definitionId: string, channel: string): Promise<Record<string, unknown> | null> {
    if (!env.WEBHOOK_TARGET_URL) return null

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (env.WEBHOOK_SECRET) {
      headers['X-Webhook-Secret'] = env.WEBHOOK_SECRET
    }

    const body = JSON.stringify({
      event: 'onboarding.completed',
      definitionId,
      channel,
      data: collectedData,
      conversationId,
      completedAt: new Date().toISOString(),
    })

    try {
      const response = await fetch(env.WEBHOOK_TARGET_URL, {
        method: 'POST',
        headers,
        body,
      })
      console.log(`[webhook] POST ${env.WEBHOOK_TARGET_URL} → ${response.status}`)

      const contentType = response.headers.get('content-type') ?? ''
      const responseBody = response.ok && contentType.includes('application/json')
        ? await response.json() as Record<string, unknown>
        : null
      console.log(`[webhook] Response body:`, responseBody ? JSON.stringify(responseBody) : '(no JSON body)')
      return responseBody
    } catch (error) {
      console.error(`[webhook] POST ${env.WEBHOOK_TARGET_URL} failed:`, error)
      return null
    }
  }
}

export const webhookService = new WebhookService()
