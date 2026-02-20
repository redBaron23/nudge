import { eq, and } from 'drizzle-orm'
import { db } from '../db/client.js'
import { conversations } from '../db/schema.js'

type ConversationStatus = 'active' | 'reviewing' | 'completed'
export type Channel = 'telegram' | 'whatsapp'

class ConversationRepository {
  findByExternalId(channel: Channel, externalId: string) {
    return db.query.conversations.findFirst({
      where: and(eq(conversations.channel, channel), eq(conversations.externalId, externalId)),
    })
  }

  async create(channel: Channel, externalId: string, opts?: { token?: string; userName?: string }) {
    const [created] = await db.insert(conversations).values({
      channel,
      externalId,
      token: opts?.token,
      userName: opts?.userName,
    }).returning()
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
