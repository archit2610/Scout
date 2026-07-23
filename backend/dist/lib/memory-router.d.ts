import { type RetrievedChunk } from '../services/embedding.service.js';
export type RoutingDecision = 'answer_from_memory' | 'run_agent';
export interface RouterResult {
    decision: RoutingDecision;
    retrievedChunks: RetrievedChunk[];
    reasoning: string;
    contextTokens: number;
}
export declare const buildContextBlock: (chunks: RetrievedChunk[]) => string;
export declare const routeMessage: (message: string, conversationId: string) => Promise<RouterResult>;
//# sourceMappingURL=memory-router.d.ts.map