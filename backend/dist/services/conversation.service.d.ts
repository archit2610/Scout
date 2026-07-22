export declare const GUEST_COOKIE_NAME = "scout_temp_id";
export declare const createConversation: (owner: {
    userId?: string;
    guestTempId?: string;
}, firstQuestion: string) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string | null;
    anonymousVisitorId: string | null;
    title: string;
} | undefined>;
export declare const getConversationsByOwner: (owner: {
    userId?: string;
    guestTempId?: string;
}) => Promise<{
    id: string;
    userId: string | null;
    anonymousVisitorId: string | null;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}[]>;
export declare const getConversationById: (id: string) => Promise<{
    id: string;
    userId: string | null;
    anonymousVisitorId: string | null;
    title: string;
    createdAt: Date;
    updatedAt: Date;
} | null>;
export declare const getConversationReports: (conversationId: string) => Promise<{
    id: string;
    userId: string | null;
    conversationId: string | null;
    question: string;
    subQuestions: string[] | null;
    reportMd: string | null;
    citations: {
        url: string;
        title: string;
    }[] | null;
    status: string;
    tokensUsed: number | null;
    costUsd: number | null;
    usedMemory: boolean | null;
    embedding: number[] | null;
    createdAt: Date;
}[]>;
export declare const deleteConversation: (conversationId: string) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string | null;
    anonymousVisitorId: string | null;
    title: string;
} | undefined>;
export declare const migrateGuestConversationsToUser: (guestTempId: string, userId: string) => Promise<number | undefined>;
//# sourceMappingURL=conversation.service.d.ts.map