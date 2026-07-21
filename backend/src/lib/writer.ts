import { streamText } from "ai";
import { google } from "@ai-sdk/google";

type Emitter = (event: object) => void

interface WriterResult {
    reportMd: string;
    tokensUsed: number;
    costUsd: number;
}

export const writerReport = async (question: string, context: string, emit: Emitter): Promise<WriterResult> => {
    const result = await streamText({
        model: google("gemini-2.5-flash"),
        prompt: `Question:
                ${question}

                Context:
                ${context || "No external context provided."}

                Instructions:
                - If external context is provided, answer using ONLY the provided context.
                - If no external context is provided, answer using your internal knowledge.
                - If the provided context is insufficient, explicitly say so.
                - Organize the answer using markdown headings.
                - Be comprehensive and avoid repetition.
                - When using external context, cite the source URL after important claims.`
    });

    let fullText = ''
    for await (const chunk of result.textStream) {
        fullText += chunk;

        emit({ type: 'token', data: chunk })
    }

    const usage = await result.usage;

    const cost =
        (usage?.inputTokens ?? 0) * 0.000003 +
        (usage?.outputTokens ?? 0) * 0.000015;

    console.log(fullText)

    return {
        reportMd: fullText,
        tokensUsed: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
        costUsd: cost,
    }
}