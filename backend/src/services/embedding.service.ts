import { google } from '@ai-sdk/google'
import { db } from '../db/index.js'
import { memoryChunks, messages, conversations } from '../db/schema.js'
import { sql } from 'drizzle-orm'
import { encoding_for_model } from 'tiktoken'
import { embed, embedMany } from 'ai'

const enc = encoding_for_model('text-embedding-3-small')

export const countTokens = (text: string): number => {
    return enc.encode(text).length
}


export const embedText = async (text: string): Promise<number[]> => {
    const response = await embed({
        model: google.textEmbeddingModel("gemini-embedding-001"),
        value: text.slice(0, 8000),  // hard cap — model max is 8191 tokens
    })
    return response.embedding
}

export const embedBatch = async (texts: string[]): Promise<number[][]> => {
    const response = await embedMany({
        model: google.textEmbeddingModel("gemini-embedding-001"),
        values: texts.map(t => t.slice(0, 8000)),
    })
    return response.embeddings
}

export const chunkText = (
    text: string,
    targetTokens = 500,
    overlapTokens = 50
): string[] => {
    const paragraphs = text.split(/\n\n+/)
    const chunks: string[] = []
    let current = ''
    let currentTokens = 0

    for (const para of paragraphs) {
        const paraTokens = countTokens(para)

        if (currentTokens + paraTokens > targetTokens && current) {
            chunks.push(current.trim())
            // Overlap: keep last `overlapTokens` worth of text for context
            const words = current.split(' ')
            const overlapText = words.slice(-Math.floor(overlapTokens / 3)).join(' ')
            current = overlapText + '\n\n' + para
            currentTokens = countTokens(current)
        } else {
            current += (current ? '\n\n' : '') + para
            currentTokens += paraTokens
        }
    }

    if (current.trim()) chunks.push(current.trim())
    return chunks
}

export const embedReport = async (
    reportId: string,
    conversationId: string,
    reportMd: string
): Promise<void> => {
    const chunks = chunkText(reportMd)
    const embeddings = await embedBatch(chunks)

    await db.insert(memoryChunks).values(
        chunks.map((content, i) => ({
            conversationId,
            sourceType: 'report' as const,
            sourceId: reportId,
            content,
            tokenCount: countTokens(content),
            chunkIndex: i,
            embedding: embeddings[i],
        }))
    )
}

export const embedMessage = async (
    messageId: string,
    conversationId: string,
    content: string
): Promise<void> => {
    // Messages are usually short enough to be one chunk
    const chunks = content.length > 2000 ? chunkText(content) : [content]
    const embeddings = await embedBatch(chunks)

    await db.insert(memoryChunks).values(
        chunks.map((chunk, i) => ({
            conversationId,
            sourceType: 'message' as const,
            sourceId: messageId,
            content: chunk,
            tokenCount: countTokens(chunk),
            chunkIndex: i,
            embedding: embeddings[i],
        }))
    )
}

export interface RetrievedChunk {
    id: string
    content: string
    sourceType: string
    sourceId: string
    similarity: number
    tokenCount: number
}

export const retrieveRelevantChunks = async (
    query: string,
    conversationId: string,
    topK = 6,
    minSimilarity = 0.65
): Promise<RetrievedChunk[]> => {
    const queryEmbedding = await embedText(query)


    const vector = JSON.stringify(queryEmbedding)

    const result = await db.execute<{
        id: string
        content: string
        source_type: string
        source_id: string
        similarity: number
        token_count: number
    }>(sql`
    SELECT
        id,
        content,
        source_type,
        source_id,
        1 - (embedding <=> ${vector}::vector) AS similarity,
        token_count
    FROM memory_chunks
    WHERE conversation_id = ${conversationId}
      AND 1 - (embedding <=> ${vector}::vector) > ${minSimilarity}
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${topK}
`)

    return result.rows.map(r => ({
        id: r.id,
        content: r.content,
        sourceType: r.source_type,
        sourceId: r.source_id,
        similarity: r.similarity,
        tokenCount: r.token_count,
    }))
}
