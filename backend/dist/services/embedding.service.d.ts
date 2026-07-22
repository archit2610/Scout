export interface RetrievedChunk {
    id: string;
    content: string;
    tokenCount: number;
    chunkIndex: number;
    similarity: number;
}
export declare const countTokensApprox: (text: string) => number;
export declare const embedText: (text: string) => Promise<number[]>;
export declare const embedBatch: (texts: string[]) => Promise<number[][]>;
export declare const chunkText: (text: string, targetTokens?: number, overlapTokens?: number) => string[];
export declare const storeReportMemory: (reportId: string, conversationId: string, reportMd: string) => Promise<void>;
export declare const retrieveRelevantChunks: (query: string, conversationId: string, topK?: number, minSimilarity?: number) => Promise<RetrievedChunk[]>;
export declare const buildContextBlock: (chunks: RetrievedChunk[]) => string;
//# sourceMappingURL=embedding.service.d.ts.map