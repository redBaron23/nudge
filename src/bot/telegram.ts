import { Bot, webhookCallback } from 'grammy'
import { ENV } from '../config/constants.js'
import { onboardingService } from '../services/onboarding.service.js'

export const bot = new Bot(ENV.TELEGRAM_BOT_TOKEN)

bot.command('start', async (ctx) => {
  const chatId = ctx.chat.id.toString()
  await onboardingService.startConversation(chatId)
  await ctx.reply('Hola! Soy tu asistente de configuración. Vamos a configurar tu sistema de turnos. Para empezar, contame: ¿cómo se llama tu negocio?')
})

bot.command('reiniciar', async (ctx) => {
  const chatId = ctx.chat.id.toString()
  await onboardingService.resetConversation(chatId)
  await ctx.reply('Listo, reinicié la configuración. Empecemos de nuevo: ¿cómo se llama tu negocio?')
})

bot.on('message:text', async (ctx) => {
  const chatId = ctx.chat.id.toString()
  const userText = ctx.message.text

  try {
    const { response } = await onboardingService.handleMessage(chatId, userText)
    await ctx.reply(response)
  } catch (error) {
    console.error('Error handling message:', error)
    await ctx.reply('Perdón, tuve un problema procesando tu mensaje. ¿Podés intentar de nuevo?')
  }
})

export const handleWebhook = webhookCallback(bot, 'hono')
