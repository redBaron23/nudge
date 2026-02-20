import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from 'yaml'
import { agendaSchema, type Agenda, type AgendaField, type CollectedData } from './schema.js'

let cachedAgenda: Agenda | null = null

export function loadAgenda(): Agenda {
  if (cachedAgenda) return cachedAgenda

  const raw = readFileSync(join(process.cwd(), 'onboarding/agenda.yaml'), 'utf-8')
  const parsed = parse(raw)
  cachedAgenda = agendaSchema.parse(parsed)
  return cachedAgenda
}

export function getPendingFields(agenda: Agenda, collectedData: CollectedData): AgendaField[] {
  return agenda.fields.filter((field) => !(field.key in collectedData))
}

export function getCollectedFields(agenda: Agenda, collectedData: CollectedData): { field: AgendaField; value: unknown }[] {
  return agenda.fields
    .filter((field) => field.key in collectedData)
    .map((field) => ({ field, value: collectedData[field.key] }))
}

export function isComplete(agenda: Agenda, collectedData: CollectedData): boolean {
  return agenda.fields
    .filter((field) => field.required)
    .every((field) => field.key in collectedData)
}
