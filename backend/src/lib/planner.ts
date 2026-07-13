import { google } from '@ai-sdk/google'
import { db } from '../db/index.js'
import { toolCalls } from '../db/schema.js'
import { generateObject } from 'ai'
import { z } from "zod";

const PlannerSchema = z.object({
    needsWebSearch: z.boolean(),
    reason: z.string(),
    subQuestions: z.array(z.string())
});
type ResearchPlan = z.infer<typeof PlannerSchema>;
export const planResearch = async (question: string): Promise<ResearchPlan> => {
    const start = Date.now()


    const response = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: PlannerSchema,
        prompt: `
                You are a research planner.

               Question:
                ${question}

                If the question depends on:
                - recent events,
                - current news,
                - recent software versions,
                - current APIs,
                - live prices,
                - or factual information that may have changed,

                set needsWebSearch = true.

                Otherwise set needsWebSearch = false.

                If web search is needed,
                break the question into 3–5 searchable sub-questions.

                If not,
                return the original question as the only sub-question.
                `,
        output: "object"
    });

    // const subQuestions = response.object.subQuestions;
    // const usage = await response.usage

    // await db.insert(toolCalls).values({
    //     reportId, stage: 'planner',
    //     toolName: 'set_research_plan',
    //     inputJson: { question },
    //     outputJson: { subQuestions },
    //     latencyMs: Date.now() - start,
    //     inputTokens: usage.inputTokens ?? 0,
    //     outputTokens: usage.outputTokens ?? 0,
    // })

    return response.object;
}