import { Bot, webhookCallback } from 'grammy'
import { ENV } from '../config/constants.js'
import { onboardingService } from '../services/onboarding.service.js'

export const bot = new Bot(ENV.TELEGRAM_BOT_TOKEN)

bot.command('start', async (ctx) => {
  const chatId = ctx.chat.id.toString()
  try {
    const { response } = await onboardingService.startConversation('telegram', chatId)
    await ctx.reply(response)
  } catch (error) {
    console.error('Error in /start:', error)
    await ctx.reply('Perdón, tuve un problema iniciando. ¿Podés intentar de nuevo?')
  }
})

bot.command('reiniciar', async (ctx) => {
  const chatId = ctx.chat.id.toString()
  try {
    const { response } = await onboardingService.resetConversation('telegram', chatId)
    await ctx.reply(response)
  } catch (error) {
    console.error('Error in /reiniciar:', error)
    await ctx.reply('Perdón, tuve un problema reiniciando. ¿Podés intentar de nuevo?')
  }
})

bot.on('message:text', async (ctx) => {
  const chatId = ctx.chat.id.toString()
  const userText = ctx.message.text

  try {
    const { response, followUp } = await onboardingService.handleMessage('telegram', chatId, userText)
    await ctx.reply(response)
    if (followUp) {
      console.log(`[telegram] Sending follow-up to ${chatId}`)
      await ctx.reply(followUp)
    }
  } catch (error) {
    console.error('Error handling message:', error)
    await ctx.reply('Perdón, tuve un problema procesando tu mensaje. ¿Podés intentar de nuevo?')
  }
})

export const handleWebhook = webhookCallback(bot, 'hono')
