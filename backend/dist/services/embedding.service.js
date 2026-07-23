import { google } from '@ai-sdk/google';
import { db } from '../db/index.js';
import { memoryChunks } from '../db/schema.js';
import { sql } from 'drizzle-orm';
import { embed, embedMany } from 'ai';
export const countTokensApprox = (text) => {
    return Math.ceil(text.length / 4);
};
export const embedText = async (text) => {
    const response = await embed({
        model: google.textEmbeddingModel("gemini-embedding-001"),
        value: text.slice(0, 8000),
    });
    return response.embedding;
};
export const embedBatch = async (texts) => {
    if (texts.length === 0)
        return [];
    const response = await embedMany({
        model: google.textEmbeddingModel("gemini-embedding-001"),
        values: texts.map(t => t.slice(0, 8000)),
    });
    return response.embeddings;
};
export const chunkText = (text, targetTokens = 500, overlapTokens = 50) => {
    const paragraphs = text.split(/\n\n+/);
    const chunks = [];
    let current = '';
    let currentTokens = 0;
    for (const para of paragraphs) {
        const paraTokens = countTokensApprox(para);
        if (currentTokens + paraTokens > targetTokens && current) {
            chunks.push(current.trim());
            const words = current.split(/\s+/);
            const overlapWordsCount = Math.min(words.length, Math.floor(overlapTokens / 1.3));
            const overlapText = words.slice(-overlapWordsCount).join(' ');
            current = overlapText + '\n\n' + para;
            currentTokens = countTokensApprox(current);
        }
        else {
            current += (current ? '\n\n' : '') + para;
            currentTokens += paraTokens;
        }
    }
    if (current.trim())
        chunks.push(current.trim());
    return chunks;
};
export const storeReportMemory = async (reportId, conversationId, reportMd) => {
    const chunks = chunkText(reportMd, 500, 50);
    if (chunks.length === 0)
        return;
    const embeddings = await embedBatch(chunks);
    const memoryRecords = chunks.map((content, i) => ({
        conversationId,
        reportId,
        content,
        tokenCount: countTokensApprox(content),
        chunkIndex: i,
        embedding: embeddings[i],
    }));
    await db.insert(memoryChunks).values(memoryRecords);
};
export const retrieveRelevantChunks = async (query, conversationId, topK = 6, minSimilarity = 0.65) => {
    const queryVector = await embedText(query);
    const vectorString = `[${queryVector.join(',')}]`;
    const result = await db.execute(sql `
        SELECT 
            id,
            content,
            token_count,
            chunk_index,
            1 - (embedding <=> ${vectorString}::vector) as similarity
        FROM ${memoryChunks}
        WHERE conversation_id = ${conversationId}::uuid
          AND 1 - (embedding <=> ${vectorString}::vector) >= ${minSimilarity}
        ORDER BY similarity DESC
        LIMIT ${topK};
    `);
    return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        tokenCount: row.token_count,
        chunkIndex: row.chunk_index,
        similarity: Number(row.similarity),
    }));
};
export const buildContextBlock = (chunks) => {
    if (chunks.length === 0)
        return '';
    return chunks
        .sort((a, b) => b.similarity - a.similarity)
        .map((c, i) => `[Memory Chunk ${i + 1} | Relevance: ${(c.similarity * 100).toFixed(0)}%]\n${c.content}`)
        .join('\n\n---\n\n');
};
//# sourceMappingURL=embedding.service.js.map