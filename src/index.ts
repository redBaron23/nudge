import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { env } from './config/env.js'
import { bot, handleWebhook } from './bot/telegram.js'

const app = new Hono()

app.get('/', (c) => c.json({ status: 'ok' }))
app.post('/webhook', handleWebhook)

serve({ fetch: app.fetch, port: env.PORT }, async (info) => {
  await bot.api.setWebhook(`${env.WEBHOOK_URL}/webhook`)
  console.log(`Nudge running on http://localhost:${info.port}`)
  console.log(`Webhook set to ${env.WEBHOOK_URL}/webhook`)
})
