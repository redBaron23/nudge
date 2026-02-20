import { z } from 'zod'

const subFieldSchema = z.object({
  type: z.string(),
  required: z.boolean().optional(),
  description: z.string().optional(),
  default: z.unknown().optional(),
  format: z.string().optional(),
  items: z.unknown().optional(),
})

const onboardingFieldSchema = z.object({
  type: z.string(),
  required: z.boolean().default(false),
  description: z.string(),
  values: z.array(z.string()).optional(),
  default: z.unknown().optional(),
  format: z.string().optional(),
  example: z.unknown().optional(),
  items: z.record(z.string(), subFieldSchema).optional(),
  properties: z.record(z.string(), subFieldSchema).optional(),
})

const webhookSchema = z.object({
  event: z.string(),
  method: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  body_format: z.record(z.string(), z.unknown()).optional(),
})

const completionSchema = z.object({
  message_template: z.string(),
  response_fields: z.array(z.string()),
})

export const onboardingDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  fields: z.record(z.string(), onboardingFieldSchema),
  webhook: webhookSchema.optional(),
  completion: completionSchema.optional(),
})

export type OnboardingField = z.infer<typeof onboardingFieldSchema>
export type OnboardingDefinition = z.infer<typeof onboardingDefinitionSchema>
export type CollectedData = Record<string, unknown>
