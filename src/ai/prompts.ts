import type { Agenda, CollectedData } from '../onboarding/schema.js'
import { getPendingFields, getCollectedFields, isComplete } from '../onboarding/flow.js'

export function buildSystemPrompt(agenda: Agenda, collectedData: CollectedData, status: string): string {
  const collected = getCollectedFields(agenda, collectedData)
  const pending = getPendingFields(agenda, collectedData)
  const complete = isComplete(agenda, collectedData)

  const dataToCollect = agenda.fields
    .map((f) => `- ${f.label}: ${f.description}${f.required ? '' : ' (opcional)'}`)
    .join('\n')

  let progressSection = ''

  if (collected.length > 0) {
    const collectedLines = collected
      .map((c) => `- ${c.field.label}: ${JSON.stringify(c.value)}`)
      .join('\n')
    progressSection += `\nYa recopilado:\n${collectedLines}\n`
  }

  if (pending.length > 0) {
    const pendingLines = pending
      .map((f) => `- ${f.label}${f.required ? '' : ' (opcional)'}`)
      .join('\n')
    progressSection += `\nPendiente:\n${pendingLines}\n`
  }

  let instruction: string
  if (status === 'reviewing' || (status === 'active' && complete)) {
    const optionalPending = pending.filter((f) => !f.required)
    const optionalNote = optionalPending.length > 0
      ? `\nMencioná que también podés configurar: ${optionalPending.map((f) => f.label.toLowerCase()).join(', ')}.`
      : ''
    instruction = `Presentá un resumen completo de toda la configuración y pedí confirmación explícita al usuario. Si el usuario quiere cambiar algo, preguntá qué dato corregir.${optionalNote}`
  } else if (status === 'completed') {
    instruction = `La configuración ya está completa.`
  } else {
    instruction = `Preguntá sobre el siguiente dato pendiente de forma natural.`
  }

  return `Sos un asistente de onboarding para negocios. Tu trabajo es guiar al dueño del negocio para configurar su sistema de turnos a través de una conversación natural.

Hablás en español argentino (voseo). Sos amigable y profesional.

Hacé UNA pregunta a la vez. No apures al usuario ni le pidas varios datos juntos.

Datos que necesitás recopilar:
${dataToCollect}
${progressSection}
${instruction}

Reglas:
- Respondé en texto plano, sin markdown ni formato especial (es para Telegram)
- Sé conciso: 2-4 oraciones por respuesta
- No inventes datos, solo usá lo que el usuario te diga
- Si el usuario pregunta algo fuera de tema, redirigilo amablemente al proceso de configuración`
}
