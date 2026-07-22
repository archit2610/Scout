import { retrieveRelevantChunks } from '../services/embedding.service.js';
export const buildContextBlock = (chunks) => {
    if (chunks.length === 0)
        return '';
    return chunks
        .sort((a, b) => b.similarity - a.similarity)
        .map((c, i) => `[Memory ${i + 1}] (relevance: ${(c.similarity * 100).toFixed(0)}%)\n${c.content}`)
        .join('\n\n---\n\n');
};
export const routeMessage = async (message, conversationId) => {
    const retrievedChunks = await retrieveRelevantChunks(message, conversationId, 8, 0.65);
    const contextTokens = retrievedChunks.reduce((sum, c) => sum + c.tokenCount, 0);
    if (retrievedChunks.length === 0) {
        return {
            decision: 'run_agent',
            retrievedChunks: [],
            reasoning: 'No relevant memory found',
            contextTokens: 0,
        };
    }
    // Step 2: Ask Claude if the retrieved context is sufficient to answer
    const contextBlock = buildContextBlock(retrievedChunks);
    const routerResponse = await claude.messages.create({
        model: 'claude-haiku-4-5-20251001', // Haiku — fast + cheap for routing
        max_tokens: 100,
        system: `You are a routing agent. Given a user message and retrieved memory context,
decide whether the context is sufficient to answer the question without a new web search.

Respond with ONLY one of these two words:
- MEMORY (if context is sufficient to give a complete, accurate answer)
- SEARCH (if the question needs fresh information not covered in context)

Be conservative: if in doubt, respond SEARCH.`,
        messages: [{
                role: 'user',
                content: `User message: "${message}"\n\nAvailable memory context:\n${contextBlock.slice(0, 3000)}`
            }]
    });
    const decision = routerResponse.content[0].type === 'text' &&
        routerResponse.content[0].text.trim().toUpperCase().includes('MEMORY')
        ? 'answer_from_memory'
        : 'run_agent';
    return {
        decision,
        retrievedChunks,
        reasoning: routerResponse.content[0].type === 'text'
            ? routerResponse.content[0].text
            : 'unknown',
        contextTokens,
    };
};
//# sourceMappingURL=memory-router.js.map