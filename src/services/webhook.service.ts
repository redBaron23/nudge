import { env } from '../config/env.js'
import type { CollectedData } from '../onboarding/schema.js'

class WebhookService {
  async sendCompletedConfig(
    collectedData: CollectedData,
    definitionId: string,
    token: string | null,
  ): Promise<Record<string, unknown> | null> {
    const url = env.WEBHOOK_TARGET_URL
    if (!url) {
      console.log('[webhook] WEBHOOK_TARGET_URL not set — skipping')
      return null
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (env.WEBHOOK_SECRET) {
      headers['X-Webhook-Secret'] = env.WEBHOOK_SECRET
    }

    const payload = {
      event: 'onboarding.completed',
      definitionId,
      token,
      data: collectedData,
      completedAt: new Date().toISOString(),
    }

    try {
      console.log(`[webhook] → POST ${url}`)
      console.log(`[webhook] → Body:`, JSON.stringify(payload, null, 2))

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const contentType = response.headers.get('content-type') ?? ''
      if (!response.ok) {
        const text = await response.text()
        console.log(`[webhook] ← ${response.status} Error:`, text)
        return null
      }
      if (!contentType.includes('application/json')) {
        const text = await response.text()
        console.log(`[webhook] ← ${response.status} (non-JSON):`, text)
        return null
      }
      const responseBody = await response.json() as Record<string, unknown>
      console.log(`[webhook] ← ${response.status}`)
      console.log(`[webhook] ← Body:`, JSON.stringify(responseBody, null, 2))
      return responseBody
    } catch (error) {
      console.error(`[webhook] ← Error:`, error)
      return null
    }
  }
}

export const webhookService = new WebhookService()
