import { env } from './env.js'

const WEBHOOK_URL = env.WEBHOOK_URL
  ?? (env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : null)

if (!WEBHOOK_URL) {
  throw new Error('Either WEBHOOK_URL or RAILWAY_PUBLIC_DOMAIN must be set')
}

export const ENV = {
  ...env,
  WEBHOOK_URL,
}
