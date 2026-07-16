type Emitter = (event: object) => void;
interface Report {
    reportMd: string;
    tokensUsed: number;
    costUsd: number;
}
export declare const runResearch: (question: string, emit: Emitter) => Promise<Report>;
export {};
//# sourceMappingURL=agent.d.ts.map