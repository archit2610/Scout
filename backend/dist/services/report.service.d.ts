import { reports, type Report } from "../db/schema.js";
interface createReportOptions {
    userId?: string | undefined;
    question: string;
    conversationId: string;
}
export declare const createReport: ({ userId, question, conversationId }: createReportOptions) => Promise<Report>;
export declare const getReportsByUser: (userId: string) => Promise<Report[]>;
export declare const getReportById: (id: string) => Promise<Report | null>;
export declare const updateReport: (id: string, data: Partial<typeof reports.$inferInsert>) => Promise<Report>;
export declare const deletereport: (id: string) => Promise<Report>;
export {};
//# sourceMappingURL=report.service.d.ts.map