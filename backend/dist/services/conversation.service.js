import { db } from '../db/index.js';
import { conversations, reports } from '../db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';
export const GUEST_COOKIE_NAME = 'scout_temp_id';
export const createConversation = async (owner, firstQuestion) => {
    const title = firstQuestion.length > 80 ? firstQuestion.slice(0, 77) + '...' : firstQuestion;
    const [convo] = await db.insert(conversations).values({
        userId: owner.userId || null,
        anonymousVisitorId: owner.userId ? null : owner.guestTempId,
        title,
    }).returning();
    return convo;
};
export const getConversationsByOwner = async (owner) => {
    if (owner.userId) {
        return db.select()
            .from(conversations)
            .where(eq(conversations.userId, owner.userId))
            .orderBy(desc(conversations.updatedAt));
    }
    if (owner.guestTempId) {
        return db.select()
            .from(conversations)
            .where(eq(conversations.anonymousVisitorId, owner.guestTempId))
            .orderBy(desc(conversations.updatedAt));
    }
    return [];
};
export const getConversationById = async (id) => {
    const [convo] = await db.select().from(conversations).where(eq(conversations.id, id));
    return convo || null;
};
export const getConversationReports = async (conversationId) => {
    return db.select()
        .from(reports)
        .where(eq(reports.conversationId, conversationId))
        .orderBy(asc(reports.createdAt));
};
export const deleteConversation = async (conversationId) => {
    const [deleted] = await db.delete(conversations).where(eq(conversations.id, conversationId)).returning();
    return deleted;
};
export const migrateGuestConversationsToUser = async (guestTempId, userId) => {
    if (!guestTempId || !userId)
        return;
    const migratedConvos = await db.update(conversations)
        .set({ userId, anonymousVisitorId: null })
        .where(eq(conversations.anonymousVisitorId, guestTempId))
        .returning();
    for (const convo of migratedConvos) {
        await db.update(reports)
            .set({ userId })
            .where(eq(reports.conversationId, convo.id));
    }
    return migratedConvos.length;
};
//# sourceMappingURL=conversation.service.js.map