import Anthropic from '@anthropic-ai/sdk'
import { buildContextBlock } from './memory-router.js'
import { runResearch } from '../services/agent.service.js'
import {
    embedMessage,
    embedReport,
    countTokens,
} from '../services/embedding.service.js'
import {
    addMessage,
    getRecentMessages,
} from '../services/conversation.service.js'
import { db } from '../db/index.js'
import { reports, conversations } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const claude = new Anthropic()

// Max tokens to use for recent message history in context window
const MAX_HISTORY_TOKENS = 2000
// Max tokens for retrieved memory context
const MAX_MEMORY_TOKENS = 3000

type Emitter = (event: object) => void

export const handleChatTurn = async (
    conversationId: string,
    userId: string,
    userMessageContent: string,
    emit: Emitter
): Promise<void> => {
    // 1. Save user message
    const userMsg = await addMessage({
        conversationId,
        role: 'user',
        content: userMessageContent,
    })

    // Embed user message in background (don't await — non-blocking)
    embedMessage(userMsg.id, conversationId, userMessageContent).catch(console.error)

    // 2. Route: memory or search?
    emit({ type: 'stage', label: 'Thinking...' })
    const routing = await routeMessage(userMessageContent, conversationId)

    emit({
        type: 'routing',
        decision: routing.decision,
        label: routing.decision === 'answer_from_memory'
            ? `Found ${routing.retrievedChunks.length} relevant memories — answering from context`
            : 'Need fresh information — running research',
    })

    let reportId: string | undefined

    // 3a. If search needed — run the v1 agent pipeline
    if (routing.decision === 'run_agent') {
        // Create a report linked to this conversation
        const [report] = await db.insert(reports).values({
            userId,
            question: userMessageContent,
            conversationId,     // new FK added in schema
            status: 'pending',
        }).returning()

        reportId = report.id

        // Run the agent (this streams its own events)
        await runScout(report.id, userMessageContent, emit)

        // Once done, embed the report into conversation memory
        const [completedReport] = await db.select()
            .from(reports)
            .where(eq(reports.id, report.id))

        if (completedReport.reportMd) {
            emit({ type: 'stage', label: 'Storing in memory...' })
            await embedReport(report.id, conversationId, completedReport.reportMd)
        }

        // Re-retrieve chunks now that we have the new report
        const freshChunks = await routeMessage(userMessageContent, conversationId)
        routing.retrievedChunks = freshChunks.retrievedChunks
    }

    // 3b. Build context for final answer
    const memoryContext = buildContextBlock(routing.retrievedChunks)

    // 4. Build recent message history (sliding window)
    const recentMessages = await getRecentMessages(conversationId, 12)
    let historyTokens = 0
    const historyMessages: { role: 'user' | 'assistant'; content: string }[] = []

    // Include messages newest-first until token budget runs out
    for (const msg of [...recentMessages].reverse()) {
        const tokens = countTokens(msg.content)
        if (historyTokens + tokens > MAX_HISTORY_TOKENS) break
        historyMessages.unshift({ role: msg.role as 'user' | 'assistant', content: msg.content })
        historyTokens += tokens
    }

    // 5. Final synthesis — stream the conversational reply
    emit({ type: 'stage', label: 'Composing reply...' })

    const systemPrompt = `You are Scout, an AI research assistant with persistent memory.
You maintain ongoing research conversations and build on previous findings.

${memoryContext ? `## Relevant memory from this conversation:\n${memoryContext}\n\n` : ''}
Guidelines:
- Reference previous research naturally: "Based on what we found earlier..." or "Adding to the pgvector analysis..."
- Cite specific sources when using retrieved memory
- If you just completed a new research run, synthesize its findings conversationally
- Be concise in follow-ups — don't repeat what the user already knows from the conversation
- Ask clarifying questions when the user's intent is ambiguous`

    let fullReply = ''
    const start = Date.now()

    const stream = claude.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
            ...historyMessages,
            { role: 'user', content: userMessageContent },
        ],
    })

    for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullReply += chunk.delta.text
            emit({ type: 'token', data: chunk.delta.text })
        }
    }

    const finalMsg = await stream.finalMessage()
    const usage = finalMsg.usage
    const cost = (usage.input_tokens * 0.000003) + (usage.output_tokens * 0.000015)

    // 6. Save assistant message
    const assistantMsg = await addMessage({
        conversationId,
        role: 'assistant',
        content: fullReply,
        reportId,
        tokensUsed: usage.input_tokens + usage.output_tokens,
        costUsd: cost,
        usedMemory: routing.decision === 'answer_from_memory',
        retrievedChunkIds: routing.retrievedChunks.map(c => c.id),
    })

    // Embed assistant reply in background
    embedMessage(assistantMsg.id, conversationId, fullReply).catch(console.error)

    emit({
        type: 'done',
        messageId: assistantMsg.id,
        usedMemory: routing.decision === 'answer_from_memory',
        cost,
    })
}