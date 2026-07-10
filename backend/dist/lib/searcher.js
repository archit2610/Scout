import { tavily } from 'tavily';
import { db } from '../db/index.js';
import { toolCalls } from '../db/schema.js';
const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
export const searchWeb = async (query, reportId) => {
    const start = Date.now();
    try {
        const result = await client.search(query, { maxResults: 5, searchDepth: 'basic' });
        const results = result.results ?? [];
        await db.insert(toolCalls).values({
            reportId,
            stage: 'searcher',
            toolName: 'web_search',
            inputJson: { query },
            outputJson: result.results.map((r) => ({ url: r.url, title: r.title, content: r.content })),
            latencyMs: Date.now() - start,
        });
        return results;
    }
    catch (err) {
        console.error(err);
        await db.insert(toolCalls).values({
            reportId,
            stage: "searcher",
            toolName: "web_search",
            inputJson: { query },
            error: String(err),
            latencyMs: Date.now() - start,
        });
        return [];
    }
};
//# sourceMappingURL=searcher.js.map