import { reports, type Report } from "../db/schema.js";
export declare const createReport: (userId: string, question: string) => Promise<Report>;
export declare const getReportsByUser: (userId: string) => Promise<Report[]>;
export declare const getReportById: (id: string) => Promise<Report | null>;
export declare const updateReport: (id: string, data: Partial<typeof reports.$inferInsert>) => Promise<Report>;
export declare const deletereport: (id: string) => Promise<Report>;
//# sourceMappingURL=report.d.ts.map