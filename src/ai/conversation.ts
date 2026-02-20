import { eq, asc } from 'drizzle-orm'
import { db } from '../db/client.js'
import { conversations, messages } from '../db/schema.js'
import { anthropic } from './client.js'
import { buildSystemPrompt } from './prompts.js'
import { loadAgenda } from '../onboarding/flow.js'
import { isComplete } from '../onboarding/flow.js'
import { extractData } from '../onboarding/extractor.js'
import type { CollectedData } from '../onboarding/schema.js'

export async function handleMessage(telegramChatId: string, userMessage: string): Promise<{ response: string }> {
  // Find or create conversation
  let conversation = await db.query.conversations.findFirst({
    where: eq(conversations.telegramChatId, telegramChatId),
  })

  if (!conversation) {
    const [created] = await db.insert(conversations).values({ telegramChatId }).returning()
    conversation = created
  }

  // Parse collected data
  const collectedData: CollectedData = JSON.parse(conversation.collectedData)

  // Load agenda (memoized)
  const agenda = loadAgenda()

  // Build dynamic prompt
  const systemPrompt = buildSystemPrompt(agenda, collectedData)

  // Load message history
  const history = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(asc(messages.createdAt))

  // Save user message before calling Claude
  await db.insert(messages).values({
    conversationId: conversation.id,
    role: 'user',
    content: userMessage,
  })

  // Call Claude
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [...history, { role: 'user', content: userMessage }],
  })

  // Extract text from response
  const assistantText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => ('text' in block ? block.text : ''))
    .join('')

  // Save assistant message
  await db.insert(messages).values({
    conversationId: conversation.id,
    role: 'assistant',
    content: assistantText,
  })

  // Extract structured data (skip on first turn and when already completed)
  const shouldExtract = history.length > 0 && conversation.status !== 'completed'

  if (shouldExtract) {
    const updatedData = await extractData(userMessage, assistantText, agenda, collectedData)

    if (JSON.stringify(updatedData) !== JSON.stringify(collectedData)) {
      const updates: { collectedData: string; status?: 'active' | 'completed' } = {
        collectedData: JSON.stringify(updatedData),
      }

      if (isComplete(agenda, updatedData)) {
        updates.status = 'completed'
      }

      await db.update(conversations)
        .set(updates)
        .where(eq(conversations.id, conversation.id))
    }
  }

  return { response: assistantText }
}
