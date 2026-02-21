import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import QRCode from 'qrcode'
import { ENV } from './config/constants.js'
import { bot, handleWebhook } from './bot/telegram.js'
import { conversationRepository } from './repositories/conversation.repository.js'
import { messageRepository } from './repositories/message.repository.js'
import { init as whatsappInit, getQR, isConnected, sendMessage } from './channels/whatsapp.js'
import { normalizePhone } from './utils/phone.js'

const app = new Hono()

app.get('/', (c) => c.json({ status: 'ok' }))

// Telegram
app.post('/telegram/webhook', handleWebhook)

app.get('/telegram/setup', async (c) => {
  await bot.api.setWebhook(`${ENV.WEBHOOK_URL}/telegram/webhook`)
  return c.json({ status: 'ok', webhook: `${ENV.WEBHOOK_URL}/telegram/webhook` })
})

// WhatsApp
app.get('/api/whatsapp/qr', async (c) => {
  if (isConnected()) {
    return c.json({ status: 'connected' })
  }

  const qr = getQR()
  if (!qr) {
    return c.json({ status: 'waiting', message: 'QR not generated yet, refresh in a few seconds' })
  }

  const qrDataUrl = await QRCode.toDataURL(qr)
  return c.html(`<!DOCTYPE html>
<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#111">
<img src="${qrDataUrl}" style="width:300px;height:300px"/>
</body></html>`)
})

app.post('/api/whatsapp/send', async (c) => {
  const { phone, message } = await c.req.json<{ phone: string; message: string }>()
  await sendMessage(phone, message)
  return c.json({ success: true })
})

app.post('/api/nudge', async (c) => {
  const body = await c.req.json<{ phone: string; userName: string; token: string }>()
  console.log('[nudge] Received request body:', JSON.stringify(body))
  const phone = normalizePhone(body.phone)
  const { userName, token } = body

  let conversation = await conversationRepository.findByExternalId('whatsapp', phone)
  if (conversation) {
    await messageRepository.deleteByConversationId(conversation.id)
    await conversationRepository.reset(conversation.id, { token, userName })
  } else {
    conversation = await conversationRepository.create('whatsapp', phone, { token, userName })
  }

  const check = await conversationRepository.findByExternalId('whatsapp', phone)
  console.log('[nudge] DB check after save - token:', check?.token, 'id:', check?.id)

  const message = `¡Hola ${userName}! Soy tu asistente de configuración. Vi que tenés cuenta pero todavía no armaste tu agenda. ¿Querés que te ayude a configurarla en 2 minutos por acá?`
  await sendMessage(phone, message)
  await messageRepository.create(conversation.id, 'assistant', message)

  return c.json({ success: true, conversationId: conversation.id })
})

// API
app.get('/api/conversations', async (c) => {
  const conversations = await conversationRepository.findAll()
  return c.json(conversations.map((conv) => ({
    ...conv,
    collectedData: JSON.parse(conv.collectedData),
  })))
})

app.get('/api/conversations/:externalId', async (c) => {
  const externalId = c.req.param('externalId')
  const channel = (c.req.query('channel') ?? 'telegram') as 'telegram' | 'whatsapp'
  const conversation = await conversationRepository.findByExternalId(channel, externalId)
  if (!conversation) return c.json({ error: 'Not found' }, 404)
  return c.json({
    ...conversation,
    collectedData: JSON.parse(conversation.collectedData),
  })
})

serve({ fetch: app.fetch, port: ENV.PORT }, (info) => {
  console.log(`Nudge running on http://localhost:${info.port}`)
})

if (ENV.WHATSAPP_ENABLED) {
  whatsappInit().catch((err) => {
    console.error('[whatsapp] Failed to initialize:', err)
  })
} else {
  console.log('[whatsapp] Disabled (set WHATSAPP_ENABLED=true to enable)')
}
