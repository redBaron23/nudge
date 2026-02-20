import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { conversations } from '../db/schema.js'

type ConversationStatus = 'active' | 'reviewing' | 'completed'

class ConversationRepository {
  findByTelegramChatId(chatId: string) {
    return db.query.conversations.findFirst({
      where: eq(conversations.telegramChatId, chatId),
    })
  }

  async create(telegramChatId: string) {
    const [created] = await db.insert(conversations).values({ telegramChatId }).returning()
    return created
  }

  async updateData(id: number, collectedData: string, status?: ConversationStatus) {
    const updates: { collectedData: string; status?: ConversationStatus } = { collectedData }
    if (status) updates.status = status
    await db.update(conversations).set(updates).where(eq(conversations.id, id))
  }

  async updateStatus(id: number, status: ConversationStatus) {
    await db.update(conversations).set({ status }).where(eq(conversations.id, id))
  }

  async reset(id: number) {
    await db.update(conversations).set({ collectedData: '{}', status: 'active' }).where(eq(conversations.id, id))
  }

  findAll() {
    return db.query.conversations.findMany()
  }
}

export const conversationRepository = new ConversationRepository()
