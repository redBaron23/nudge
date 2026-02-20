import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { ENV } from './config/constants.js'
import { bot, handleWebhook } from './bot/telegram.js'
import { conversationRepository } from './repositories/conversation.repository.js'

const app = new Hono()

app.get('/', (c) => c.json({ status: 'ok' }))
app.post('/webhook', handleWebhook)

app.get('/api/conversations', async (c) => {
  const conversations = await conversationRepository.findAll()
  return c.json(conversations.map((conv) => ({
    ...conv,
    collectedData: JSON.parse(conv.collectedData),
  })))
})

app.get('/api/conversations/:chatId', async (c) => {
  const chatId = c.req.param('chatId')
  const conversation = await conversationRepository.findByTelegramChatId(chatId)
  if (!conversation) return c.json({ error: 'Not found' }, 404)
  return c.json({
    ...conversation,
    collectedData: JSON.parse(conversation.collectedData),
  })
})

serve({ fetch: app.fetch, port: ENV.PORT }, async (info) => {
  await bot.api.setWebhook(`${ENV.WEBHOOK_URL}/webhook`)
  console.log(`Nudge running on http://localhost:${info.port}`)
  console.log(`Webhook set to ${ENV.WEBHOOK_URL}/webhook`)
})
