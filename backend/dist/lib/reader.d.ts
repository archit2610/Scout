export interface ExtractedFact {
    url: string;
    facts: string;
}
export declare const fetchAndExtract: (url: string, subQuestion: string, reportId: string) => Promise<ExtractedFact | null>;
//# sourceMappingURL=reader.d.ts.map