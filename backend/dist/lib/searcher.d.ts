interface SearchResult {
    url: string;
    title: string;
    content: string;
}
export declare const searchWeb: (query: string, reportId: string) => Promise<SearchResult[] | null>;
export {};
//# sourceMappingURL=searcher.d.ts.map