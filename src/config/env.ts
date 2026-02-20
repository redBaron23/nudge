import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  WEBHOOK_URL: z.string().url('WEBHOOK_URL must be a valid URL'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
})

export const env = envSchema.parse(process.env)
