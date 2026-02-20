import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import type { WASocket } from '@whiskeysockets/baileys'
import { parsePhoneNumber } from 'libphonenumber-js'
import pino from 'pino'
import PQueue from 'p-queue'
import { onboardingService } from '../services/onboarding.service.js'

const sendQueue = new PQueue({ concurrency: 1 })

let sock: WASocket | null = null
let currentQR: string | null = null
let connected = false

export async function init() {
  const { state, saveCreds } = await useMultiFileAuthState('./wa-auth')

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }) as any,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      currentQR = qr
      console.log('[whatsapp] QR code available — scan at /api/whatsapp/qr')
    }

    if (connection === 'close') {
      connected = false
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log('[whatsapp] Connection closed, reconnecting...')
        init()
      } else {
        console.log('[whatsapp] Logged out, not reconnecting')
      }
    } else if (connection === 'open') {
      connected = true
      currentQR = null
      console.log('[whatsapp] Connected')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue

      console.log(`[whatsapp] Raw message:\n${JSON.stringify(msg, null, 2)}`)

      const jid = msg.key.remoteJidAlt || msg.key.remoteJid
      if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue

      if (msg.key.remoteJidAlt) {
        console.log(`[whatsapp] Using remoteJidAlt: ${msg.key.remoteJidAlt}`)
      }

      const phone = jid.replace('@s.whatsapp.net', '')
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text
      if (!text) continue

      console.log(`[whatsapp] Received from ${phone}: ${text}`)

      try {
        const { response, followUp } = await onboardingService.handleMessage('whatsapp', phone, text)
        await sendMessage(phone, response)
        if (followUp) {
          console.log(`[whatsapp] Sending follow-up to ${phone}`)
          await sendMessage(phone, followUp)
        }
      } catch (error) {
        console.error('[whatsapp] Error handling message:', error)
        await sendMessage(phone, 'Perdón, tuve un problema procesando tu mensaje. ¿Podés intentar de nuevo?')
      }
    }
  })

  console.log('[whatsapp] Message listener registered')
}

export function getQR(): string | null {
  return currentQR
}

export function isConnected(): boolean {
  return connected
}

function normalizePhone(phone: string): string {
  const parsed = parsePhoneNumber(phone, 'AR')
  if (!parsed) throw new Error(`Invalid phone number: ${phone}`)
  let normalized = parsed.format('E.164').replace('+', '')

  // WhatsApp AR mobile JIDs require "9" after country code "54"
  if (parsed.country === 'AR' && normalized.startsWith('54') && !normalized.startsWith('549')) {
    normalized = '549' + normalized.slice(2)
  }

  if (normalized !== phone) {
    console.log(`[whatsapp] Normalizing phone: ${phone} → ${normalized}`)
  }
  return normalized
}

async function sendWithRetry(phone: string, text: string) {
  const normalized = normalizePhone(phone)
  const jid = `${normalized}@s.whatsapp.net`
  const maxAttempts = 3
  const delayMs = 3000

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[whatsapp] Sending to ${normalized} (attempt ${attempt}/${maxAttempts})`)
      if (!sock) throw new Error('WhatsApp not initialized')

      // Simulate human typing: subscribe, show "composing", wait 1-3s
      await sock.presenceSubscribe(jid)
      await sock.sendPresenceUpdate('composing', jid)
      const typingDelay = 1000 + Math.random() * 2000
      await new Promise((resolve) => setTimeout(resolve, typingDelay))

      await sock.sendMessage(jid, { text })
      await sock.sendPresenceUpdate('paused', jid)
      console.log(`[whatsapp] Sent to ${normalized}`)
      return
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`[whatsapp] Failed to ${normalized} after ${maxAttempts} attempts`)
        throw error
      }
      console.warn(`[whatsapp] Attempt ${attempt} failed for ${normalized}, retrying in ${delayMs}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

export async function sendMessage(phone: string, text: string) {
  return sendQueue.add(() => sendWithRetry(phone, text))
}
