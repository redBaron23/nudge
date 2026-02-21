import { readFileSync } from 'fs'
import { join } from 'path'
import { onboardingDefinitionSchema, type OnboardingDefinition, type OnboardingField, type CollectedData } from './schema.js'

const cache = new Map<string, OnboardingDefinition>()

export function loadDefinition(id: string): OnboardingDefinition {
  const cached = cache.get(id)
  if (cached) {
    console.log(`[flow] Definition "${id}" served from cache`)
    return cached
  }

  console.log(`[flow] Loading definition "${id}" from disk`)
  const raw = readFileSync(join(process.cwd(), `onboarding/examples/${id}.json`), 'utf-8')
  const definition = onboardingDefinitionSchema.parse(JSON.parse(raw))
  cache.set(id, definition)
  return definition
}

export function clearDefinitionCache(): void {
  console.log(`[flow] Clearing definition cache (${cache.size} entries)`)
  cache.clear()
}

export function getPendingFields(definition: OnboardingDefinition, collectedData: CollectedData): [string, OnboardingField][] {
  return Object.entries(definition.fields).filter(([key]) => !(key in collectedData))
}

export function getCollectedFields(definition: OnboardingDefinition, collectedData: CollectedData): { key: string; field: OnboardingField; value: unknown }[] {
  return Object.entries(definition.fields)
    .filter(([key]) => key in collectedData)
    .map(([key, field]) => ({ key, field, value: collectedData[key] }))
}

export function isComplete(definition: OnboardingDefinition, collectedData: CollectedData): boolean {
  return Object.entries(definition.fields)
    .filter(([, field]) => field.required)
    .every(([key]) => key in collectedData)
}

export function buildCompletionMessage(
  definition: OnboardingDefinition,
  webhookResponse: Record<string, unknown> | null,
): string | null {
  if (!definition.completion) {
    console.log('[completion] No completion section in definition')
    return null
  }
  if (!webhookResponse) {
    console.log('[completion] No webhook response — skipping completion message')
    return null
  }

  const { message_template, response_fields } = definition.completion
  let message = message_template

  for (const field of response_fields) {
    const value = webhookResponse[field]
    if (value == null) {
      console.log(`[completion] Missing response field "${field}" in webhook response`)
      return null
    }
    message = message.replaceAll(`{${field}}`, String(value))
  }

  console.log(`[completion] Built message: ${message}`)
  return message
}
