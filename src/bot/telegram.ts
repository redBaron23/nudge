import { Bot, webhookCallback } from 'grammy'
import { env } from '../config/env.js'
import { handleMessage } from '../ai/conversation.js'

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN)

bot.on('message:text', async (ctx) => {
  const chatId = ctx.chat.id.toString()
  const userText = ctx.message.text

  try {
    const { response } = await handleMessage(chatId, userText)
    await ctx.reply(response)
  } catch (error) {
    console.error('Error handling message:', error)
    await ctx.reply('Perdón, tuve un problema procesando tu mensaje. ¿Podés intentar de nuevo?')
  }
})

export const handleWebhook = webhookCallback(bot, 'hono')
