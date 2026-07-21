import { db } from '../db/index.js'
import { conversations, messages, type Message } from '../db/schema.js'
import { eq, desc, asc, sql } from 'drizzle-orm'
import { embedText } from './embedding.service.js'
import { Conversation } from '../db/schema.js'

export const createConversation = async (
    userId: string,
    firstMessage: string
): Promise<Conversation> => {
    // Auto-generate title from first message (truncated)
    const title = firstMessage.length > 60
        ? firstMessage.slice(0, 60) + '...'
        : firstMessage

    const [convo] = await db.insert(conversations).values({
        userId,
        title,
    }).returning()

    if (!convo) {
        throw new Error('Failed to create conversation')
    }

    return convo
}

export const getConversationsByUser = async (userId: string) => {
    return db.select().from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt))
}

export const getConversationById = async (id: string) => {
    const [convo] = await db.select().from(conversations).where(eq(conversations.id, id))
    return convo ?? null
}


export const getRecentMessages = async (
    conversationId: string,
    limit = 10
): Promise<Message[]> => {
    return db.select().from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .then(rows => rows.reverse())
}

export const addMessage = async (data: {
    conversationId: string
    role: 'user' | 'assistant'
    content: string
    reportId?: string
    tokensUsed?: number
    costUsd?: number
    usedMemory?: boolean
    retrievedChunkIds?: string[]
}): Promise<Message> => {
    const [msg] = await db.insert(messages).values(data).returning()

    // Update conversation's updatedAt and increment messageCount
    await db.update(conversations)
        .set({ updatedAt: new Date(), messageCount: sql`message_count + 1` })
        .where(eq(conversations.id, data.conversationId))

    if (!msg) throw new Error("failed to create a message")
    return msg
}

// Periodically update conversation summary for better retrieval
// (call this every 10 messages or so)
export const updateConversationSummary = async (
    conversationId: string,
    summary: string
): Promise<void> => {
    const embedding = await embedText(summary)
    await db.update(conversations)
        .set({ summary, summaryEmbedding: embedding })
        .where(eq(conversations.id, conversationId))
}