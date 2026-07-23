type Emitter = (event: object) => void;
interface ResearchOptions {
    question: string;
    conversationId?: string;
    reportId?: string;
    emit: Emitter;
}
interface RunResearchResult {
    reportMd: string;
    tokensUsed: number;
    costUsd: number;
    usedMemory: boolean;
}
export declare const runScout: ({ question, conversationId, reportId, emit, }: ResearchOptions) => Promise<RunResearchResult>;
export {};
//# sourceMappingURL=agent.service.d.ts.map