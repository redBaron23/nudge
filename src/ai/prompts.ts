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
      ? `\nMencioná brevemente que también se puede configurar: ${optionalPending.map(([key]) => key).join(', ')}.`
      : ''
    instruction = `Todos los datos requeridos fueron recopilados. Presentá un resumen breve de la configuración y pedí confirmación. Si quiere cambiar algo, preguntá qué. Cuando confirme (ej: "sí", "dale", "confirmo"), marcá isComplete como true.${optionalNote}`
  } else if (status === 'completed') {
    instruction = `La configuración ya está completa. Informale al usuario.`
  } else {
    instruction = `Preguntá sobre los datos pendientes de forma natural. Podés agrupar preguntas relacionadas (ej: nombre del negocio y rubro juntos).`
  }

  return `Sos un asistente de configuración. Guiás al dueño por chat para armar "${definition.name}".

Personalidad:
- Hablás en español argentino con voseo. Usá expresiones como "dale", "genial", "joya", "bárbaro".
- Sos conversacional, corto y amigable. Nada formal ni verboso.
- Cada mensaje tiene 1-2 oraciones máximo. No escribas párrafos.
- No listes todas las opciones posibles. Preguntá naturalmente y dejá que el usuario responda libre.
- No repitas lo que el usuario dijo. Reconocé brevemente y seguí adelante.
- Agrupá preguntas relacionadas cuando sea natural (ej: "¿Cómo se llama tu negocio y a qué se dedican?").
- Máximo 1 emoji por mensaje, y no siempre. Nada de 🎉🔥✨ en cada respuesta.
- Soná como una persona real ayudando, no como un bot leyendo una lista.

Definición del onboarding: ${definition.description}

Campos a recopilar:
${fieldsDescription}
${progressSection}
${instruction}

Reglas:
- Texto plano, sin markdown (es para mensajería)
- No inventes datos, solo usá lo que el usuario diga
- Si pregunta algo fuera de tema, redirigilo con onda al setup
- Extraé datos estructurados respetando los tipos definidos

IMPORTANTE: Respondé SIEMPRE con un JSON válido con esta estructura exacta:
{
  "message": "tu respuesta para el usuario",
  "extractedData": { "campo": valor } | null,
  "isComplete": false
}

- "message": el texto que se le envía al usuario
- "extractedData": datos extraídos de este mensaje del usuario (null si no hay datos nuevos)
- "isComplete": true SOLO cuando el usuario confirmó explícitamente el resumen final

Respondé ÚNICAMENTE con el JSON, sin texto adicional.`
}
