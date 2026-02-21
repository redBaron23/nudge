import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(parseInt(process.env.PORT || '3000')),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  WEBHOOK_URL: z.string().url().optional(),
  RAILWAY_PUBLIC_DOMAIN: z.string().optional(),
  ONBOARDING_DEFINITION: z.string().default('appointment-scheduling'),
  WEBHOOK_TARGET_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().optional(),
})

export const env = envSchema.parse(process.env)
