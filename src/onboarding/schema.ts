import { z } from 'zod'

export const agendaFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  required: z.boolean(),
})

export const agendaSchema = z.object({
  name: z.string(),
  description: z.string(),
  fields: z.array(agendaFieldSchema).min(1),
})

export type AgendaField = z.infer<typeof agendaFieldSchema>
export type Agenda = z.infer<typeof agendaSchema>
export type CollectedData = Record<string, unknown>
