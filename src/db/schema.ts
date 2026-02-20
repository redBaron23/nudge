import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  externalId: text('external_id').notNull(),
  channel: text('channel', { enum: ['telegram', 'whatsapp'] }).default('telegram').notNull(),
  status: text('status', { enum: ['active', 'reviewing', 'completed'] }).default('active').notNull(),
  collectedData: text('collected_data').default('{}').notNull(),
  token: text('token'),
  userName: text('user_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex('channel_external_id_idx').on(table.channel, table.externalId),
])

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id').references(() => conversations.id).notNull(),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
})
