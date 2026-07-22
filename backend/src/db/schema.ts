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
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    anonymousVisitorId: text('anonymous_visitor_id'),
    title: text('title').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
    index('conv_user_idx').on(table.userId),
    index('conv_guest_idx').on(table.anonymousVisitorId),
]);

export const reports = pgTable('reports', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    conversationId: uuid("conversation_id")
        .references(
            () => conversations.id,
            { onDelete: "cascade" }
        ),
    question: text('question').notNull(),
    subQuestions: jsonb('sub_questions').$type<string[]>(),
    reportMd: text('report_md'),
    citations: jsonb('citations').$type<{ url: string; title: string }[]>(),
    status: text('status').notNull().default('pending'), // pending | running | done | error
    tokensUsed: integer('tokens_used'),
    costUsd: real('cost_usd'),
    usedMemory: boolean('used_memory').default(false),
    embedding: vector('embedding', { dimensions: 768 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
    index('reports_conversation_idx').on(table.conversationId),
]);


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

export const memoryChunks = pgTable('memory_chunks', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    reportId: uuid('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    tokenCount: integer('token_count').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    embedding: vector('embedding', { dimensions: 768 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
    index('memory_chunks_conversation_idx').on(table.conversationId),
]);

export type NewUser = typeof users.$inferInsert
export type User = typeof users.$inferSelect
export type Report = typeof reports.$inferInsert
export type ToolCalls = typeof toolCalls.$inferInsert
export type Conversation = typeof conversations.$inferSelect;
export type Memory = typeof memoryChunks.$inferSelect;
