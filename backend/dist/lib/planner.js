import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from "zod";
const PlannerSchema = z.object({
    needsWebSearch: z.boolean(),
    reason: z.string(),
    subQuestions: z.array(z.string())
});
export const planResearch = async (question, retrievedMemoryContext = '') => {
    const response = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: PlannerSchema,
        prompt: `
                You are Scout's intelligent research planner.

                Current User Question:
                "${question}"

                ${retrievedMemoryContext ? `Retrieved Context from Conversation Memory:\n${retrievedMemoryContext}\n` : 'No previous memory available.'}

                Instructions:
                1. Evaluate if the retrieved conversation memory is SUFFICIENT to fully, accurately, and completely answer the user's question
                 (e.g., summarizing previous reports, follow-up explanations, or questions covered in context).
                2. If memory context IS SUFFICIENT:
                - Set needsWebSearch = false.                                                
                - subQuestions = [original question].
                3. If fresh external web data, live news, real-time facts, current prices, or code libraries not in memory are required:
                - Set needsWebSearch = true.
                - Break the query into 3 to 5 targeted web search sub-questions.
                `,
        output: "object"
    });
    return response.object;
};
//# sourceMappingURL=planner.js.map