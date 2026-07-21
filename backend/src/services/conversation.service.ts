import { db } from '../db/index.js'
import { conversations, reports } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'

export const createConversation = async (
    userId: string,
    title: string
): Promise<typeof conversations.$inferSelect> => {
    const [convo] = await db.insert(conversations).values({
        userId,
        title: title.length > 80 ? title.slice(0, 80) + '...' : title,
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
    const [convo] = await db.select().from(conversations)
        .where(eq(conversations.id, id))
    return convo ?? null
}

export const getConversationReports = async (conversationId: string) => {
    return db.select().from(reports)
        .where(eq(reports.conversationId, conversationId))
        .orderBy(reports.createdAt)
}


export const touchConversation = async (conversationId: string) => {
    await db.update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId))
}