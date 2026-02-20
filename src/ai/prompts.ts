import type { OnboardingDefinition, OnboardingField, CollectedData } from '../onboarding/schema.js'
import { getPendingFields, getCollectedFields, isComplete } from '../onboarding/flow.js'

function renderFieldDescription(key: string, field: OnboardingField): string {
  let desc = `- ${key} (${field.type}, ${field.required ? 'requerido' : 'opcional'}): ${field.description}`

  if (field.values) {
    desc += `\n    Valores posibles: ${field.values.join(', ')}`
  }
  if (field.default !== undefined) {
    desc += `\n    Valor por defecto: ${JSON.stringify(field.default)}`
  }
  if (field.format) {
    desc += `\n    Formato: ${field.format}`
  }
  if (field.example) {
    desc += `\n    Ejemplo: ${JSON.stringify(field.example)}`
  }
  if (field.items) {
    desc += `\n    Cada elemento tiene:`
    for (const [k, sub] of Object.entries(field.items)) {
      desc += `\n      - ${k} (${sub.type}${sub.required ? ', requerido' : ''}): ${sub.description ?? ''}`
      if (sub.default !== undefined) desc += ` [default: ${JSON.stringify(sub.default)}]`
    }
  }
  if (field.properties) {
    desc += `\n    Propiedades:`
    for (const [k, sub] of Object.entries(field.properties)) {
      desc += `\n      - ${k} (${sub.type}): ${sub.description ?? ''}`
      if (sub.default !== undefined) desc += ` [default: ${JSON.stringify(sub.default)}]`
    }
  }

  return desc
}

export function buildSystemPrompt(definition: OnboardingDefinition, collectedData: CollectedData, status: string): string {
  const collected = getCollectedFields(definition, collectedData)
  const pending = getPendingFields(definition, collectedData)
  const complete = isComplete(definition, collectedData)

  const fieldsDescription = Object.entries(definition.fields)
    .map(([key, field]) => renderFieldDescription(key, field))
    .join('\n')

  let progressSection = ''

  if (collected.length > 0) {
    const collectedLines = collected
      .map((c) => `- ${c.key}: ${JSON.stringify(c.value)}`)
      .join('\n')
    progressSection += `\nDatos ya recopilados:\n${collectedLines}\n`
  }

  if (pending.length > 0) {
    const pendingLines = pending
      .map(([key, f]) => `- ${key}${f.required ? '' : ' (opcional)'}`)
      .join('\n')
    progressSection += `\nDatos pendientes:\n${pendingLines}\n`
  }

  let instruction: string
  if (status === 'reviewing' || (status === 'active' && complete)) {
    const optionalPending = pending.filter(([, f]) => !f.required)
    const optionalNote = optionalPending.length > 0
      ? `\nMencioná que también podés configurar: ${optionalPending.map(([key]) => key).join(', ')}.`
      : ''
    instruction = `Todos los datos requeridos fueron recopilados. Presentá un resumen completo de toda la configuración y pedí confirmación explícita al usuario. Si el usuario quiere cambiar algo, preguntá qué dato corregir. Cuando el usuario confirme explícitamente (ej: "sí", "dale", "confirmo"), marcá isComplete como true.${optionalNote}`
  } else if (status === 'completed') {
    instruction = `La configuración ya está completa. Informale al usuario.`
  } else {
    instruction = `Preguntá sobre el siguiente dato pendiente de forma natural. Hacé UNA pregunta a la vez.`
  }

  return `Sos un asistente de onboarding para negocios. Tu trabajo es guiar al dueño del negocio para configurar "${definition.name}" a través de una conversación natural.

Hablás en español argentino (voseo). Sos amigable y profesional.

Definición del onboarding: ${definition.description}

Campos a recopilar:
${fieldsDescription}
${progressSection}
${instruction}

Reglas:
- Respondé en texto plano, sin markdown ni formato especial (es para Telegram)
- Sé conciso: 2-4 oraciones por respuesta
- No inventes datos, solo usá lo que el usuario te diga
- Si el usuario pregunta algo fuera de tema, redirigilo amablemente al proceso de configuración
- Extraé datos estructurados de las respuestas del usuario respetando los tipos definidos

IMPORTANTE: Respondé SIEMPRE con un JSON válido con esta estructura exacta:
{
  "message": "tu respuesta en texto plano para el usuario",
  "extractedData": { "campo": valor } | null,
  "isComplete": false
}

- "message": el texto que se le envía al usuario
- "extractedData": datos extraídos de este mensaje del usuario (null si no hay datos nuevos)
- "isComplete": true SOLO cuando el usuario confirmó explícitamente el resumen final

Respondé ÚNICAMENTE con el JSON, sin texto adicional.`
}
