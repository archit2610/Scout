import { pgTable, uuid, text, timestamp, boolean, integer, real, jsonb, vector } from 'drizzle-orm/pg-core';
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
});
export const reports = pgTable('reports', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    question: text('question').notNull(),
    subQuestions: jsonb('sub_questions').$type(),
    reportMd: text('report_md'),
    citations: jsonb('citations').$type(),
    status: text('status').notNull().default('pending'), // pending | running | done | error
    tokensUsed: integer('tokens_used'),
    costUsd: real('cost_usd'),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
export const toolCalls = pgTable('tool_calls', {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id').notNull().references(() => reports.id),
    stage: text('stage').notNull(), // planner | searcher | reader | synthesizer
    toolName: text('tool_name'), // web_search | fetch_url | null
    inputJson: jsonb('input_json'),
    outputJson: jsonb('output_json'),
    latencyMs: integer('latency_ms'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    costUsd: real('cost_usd'),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
//# sourceMappingURL=schema.js.map