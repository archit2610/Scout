import { tavily } from 'tavily'
import { db } from '../db/index.js'
import { toolCalls } from '../db/schema.js'
import { error } from 'node:console'

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! })

interface SearchResult {
    url: string
    title: string
    content: string
}

export const searchWeb = async (query: string, reportId: string): Promise<SearchResult[] | null> => {
    const start = Date.now()
    try {

        const result = await client.search(query, { maxResults: 5, searchDepth: 'basic' })

        await db.insert(toolCalls).values({
            reportId,
            stage: 'searcher',
            toolName: 'web_search',
            inputJson: { query },
            outputJson: result.results.map((r: SearchResult) => ({ url: r.url, title: r.title })),
            latencyMs: Date.now() - start,
        })

        return result.results
    } catch (err) {
        console.error(error)
        return null;
    }
}