import { ApiError } from "../utils/api-error.js";
import { fetchAndExtract } from "../lib/reader.js"
import { searchWeb } from "../lib/searcher.js"
import { planResearch } from "../lib/planner.js"
import { writerReport } from "../lib/writer.js";
import { withTimeout } from "../utils/timeout.js";
import { retrieveRelevantChunks } from "./embedding.service.js";
import { buildContextBlock } from "../lib/memory-router.js";

type Emitter = (event: object) => void

interface Report {
    reportMd: string;
    tokensUsed: number;
    costUsd: number;
}

export const runResearch = async (question: string, emit: Emitter): Promise<Report> => {
    let context = '';
    emit({ type: 'stage', label: 'Planning research...' })

    const retrievedChunks = await retrieveRelevantChunks(message, conversationId, 8, 0.65)

    const contextTokens = retrievedChunks.reduce((sum, c) => sum + c.tokenCount, 0)

    if (retrievedChunks.length === 0) {
        return {
            decision: 'run_agent',
            retrievedChunks: [],
            reasoning: 'No relevant memory found',
            contextTokens: 0,
        }
    }

    // Step 2: Ask Claude if the retrieved context is sufficient to answer
    const contextBlock = buildContextBlock(retrievedChunks)

    try {
        const plan = await withTimeout(planResearch(question), 20000)

        if (plan.needsWebSearch) {

            if (plan.subQuestions.length > 5) plan.subQuestions = plan.subQuestions.slice(0, 5);
            const { subQuestions } = plan;

            emit({ type: 'plan', subQuestions })

            const searches = await withTimeout(
                Promise.all(subQuestions.map(q => searchWeb(q))),
                20_000,
                []
            );

            const results = searches
                .flat()
                .filter((r): r is NonNullable<typeof r> => r !== null);

            const uniqueResults = results
                .filter(
                    (result, index, self) =>
                        index === self.findIndex(r => r.url === result.url)
                )
                .slice(0, 8);

            emit({ type: "stage", label: "Reading sources..." });

            context = await withTimeout(fetchAndExtract(
                uniqueResults,
                question
            ), 20000, "");
            context = context.slice(0, 20000);

        }


        emit({ type: "stage", label: "Writing Report" })

        const report = await withTimeout(writerReport(question, context, emit), 30000)

        return report;
    } catch (err) {
        console.error(err)
        throw new ApiError(400, "Error getting answer")
    }
};