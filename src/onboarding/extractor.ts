import { anthropic } from '../ai/client.js'
import type { Agenda, CollectedData } from './schema.js'
import { getPendingFields } from './flow.js'

export async function extractData(
  userMessage: string,
  assistantMessage: string,
  agenda: Agenda,
  collectedData: CollectedData,
): Promise<CollectedData> {
  const pending = getPendingFields(agenda, collectedData)

  const systemPrompt = `Sos un extractor de datos estructurados. Tu única tarea es analizar la conversación y extraer datos del negocio.

Campos de la agenda:
${agenda.fields.map((f) => `- ${f.key}: ${f.label} — ${f.description}`).join('\n')}

Datos ya recopilados:
${Object.keys(collectedData).length > 0 ? JSON.stringify(collectedData, null, 2) : '(ninguno)'}

Campos pendientes:
${pending.map((f) => `- ${f.key}: ${f.label}`).join('\n')}

Formato esperado por campo:
- services: array de objetos { "name": string, "duration": string }, ej: [{"name": "Corte", "duration": "30 min"}]
- hours: objeto con días como claves, ej: {"lunes": "9:00-18:00", "martes": "9:00-18:00"}
- staff: array de strings, ej: ["Juan", "María"]
- business_name: string
- business_type: string
- booking_rules: string o objeto con las reglas

Respondé SOLAMENTE con un objeto JSON con los campos que pudiste extraer de este intercambio.
Solo incluí campos para los que el usuario dio información concreta. No inventes datos.
Si no hay datos nuevos para extraer, respondé con {}.
No incluyas campos que ya fueron recopilados a menos que el usuario los esté corrigiendo.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage },
        { role: 'user', content: 'Extraé los datos estructurados de esta conversación. Respondé solo con JSON.' },
      ],
    })

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('')

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return collectedData

    const extracted = JSON.parse(jsonMatch[0]) as Record<string, unknown>

    // Filter out null/undefined values
    const filtered: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(extracted)) {
      if (value !== null && value !== undefined) {
        filtered[key] = value
      }
    }

    if (Object.keys(filtered).length === 0) return collectedData

    return { ...collectedData, ...filtered }
  } catch (error) {
    console.error('Extraction failed:', error)
    return collectedData
  }
}
