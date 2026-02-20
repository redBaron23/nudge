import { eq, asc } from 'drizzle-orm'
import { db } from '../db/client.js'
import { messages } from '../db/schema.js'

class MessageRepository {
  findByConversationId(conversationId: number) {
    return db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
  }

  async create(conversationId: number, role: 'user' | 'assistant', content: string) {
    await db.insert(messages).values({ conversationId, role, content })
  }

  async deleteByConversationId(conversationId: number) {
    await db.delete(messages).where(eq(messages.conversationId, conversationId))
  }
}

export const messageRepository = new MessageRepository()
