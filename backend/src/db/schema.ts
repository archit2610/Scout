import {
    pgTable, uuid, text, timestamp,
    boolean, integer, real, jsonb, vector, index
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    fullName: text('full_name'),
    password: text('password').notNull(),
    avatarUrl: text('avatar_url').default('https://via.placeholder.com/200x200.png'),
    isEmailVerified: boolean('is_email_verified').default(false).notNull(),
    refreshToken: text('refresh_token'),
    forgotPasswordToken: text('forgot_password_token'),
    forgotPasswordExpiry: timestamp('forgot_password_expiry'),
    emailVerificationToken: text('email_verification_token'),
    emailVerificationExpiry: timestamp('email_verification_expiry'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const conversations = pgTable('conversations', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    title: text('title').notNull(),              // auto-generated from first message
    summary: text('summary'),                       // LLM-generated summary, updated periodically
    summaryEmbedding: vector('summary_embedding', { dimensions: 1536 }),
    messageCount: integer('message_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const reports = pgTable('reports', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    question: text('question').notNull(),
    subQuestions: jsonb('sub_questions').$type<string[]>(),
    reportMd: text('report_md'),
    citations: jsonb('citations').$type<{ url: string; title: string }[]>(),
    status: text('status').notNull().default('pending'), // pending | running | done | error
    tokensUsed: integer('tokens_used'),
    costUsd: real('cost_usd'),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    conversationId: uuid('conversation_id').references(() => conversations.id),
})


export const toolCalls = pgTable('tool_calls', {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id').notNull().references(() => reports.id),
    stage: text('stage').notNull(),     // planner | searcher | reader | synthesizer
    toolName: text('tool_name'),           // web_search | fetch_url | null
    inputJson: jsonb('input_json'),
    outputJson: jsonb('output_json'),
    latencyMs: integer('latency_ms'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    costUsd: real('cost_usd'),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversations.id),
    role: text('role').notNull(),               // 'user' | 'assistant' | 'system'
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }),
    // If this message triggered a research run, link the report
    reportId: uuid('report_id').references(() => reports.id),
    // Metadata about how this message was generated
    tokensUsed: integer('tokens_used'),
    costUsd: real('cost_usd'),
    // Was memory retrieval used for this message?
    usedMemory: boolean('used_memory').default(false),
    retrievedChunkIds: jsonb('retrieved_chunk_ids').$type<string[]>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const memoryChunks = pgTable('memory_chunks', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversations.id),
    // Source of this chunk
    sourceType: text('source_type').notNull(), // 'report' | 'message' | 'extracted_fact'
    sourceId: uuid('source_id').notNull(),   // reportId or messageId
    // The actual text content of the chunk
    content: text('content').notNull(),
    // Token count for context window management
    tokenCount: integer('token_count').notNull(),
    // Chunk position within the source document
    chunkIndex: integer('chunk_index').notNull(),
    // The embedding vector
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    // Index for fast similarity search scoped to a conversation
    conversationIdx: index('memory_chunks_conversation_idx').on(table.conversationId),
}))

export type NewUser = typeof users.$inferInsert
export type User = typeof users.$inferSelect
export type Report = typeof reports.$inferInsert
export type ToolCalls = typeof toolCalls.$inferInsert
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Memory = typeof memoryChunks.$inferSelect;
