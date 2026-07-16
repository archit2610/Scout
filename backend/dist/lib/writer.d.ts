type Emitter = (event: object) => void;
interface WriterResult {
    reportMd: string;
    tokensUsed: number;
    costUsd: number;
}
export declare const writerReport: (question: string, context: string, emit: Emitter) => Promise<WriterResult>;
export {};
//# sourceMappingURL=writer.d.ts.map