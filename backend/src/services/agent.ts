import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { updateReport } from "../services/report.js";
import { ApiError } from "../utils/api-error.js";
import { fetchAndExtract } from "../lib/reader.js"
import { searchWeb } from "../lib/searcher.js"
import { planResearch } from "../lib/planner.js"
import { reports } from "../db/schema.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm"

type Emitter = (event: object) => void


export const runResearch = async (reportId: string, question: string, emit: Emitter): Promise<void> => {
    try {
        emit({ type: 'stage', label: 'Planning research...' })
        const plan = await planResearch(question, reportId)
        const { subQuestions } = plan;

        await db.update(reports).set({ subQuestions, status: "running" }).where(eq(reports.id, reportId))
        emit({ type: 'plan', subQuestions })

        const searches = await Promise.all(
            subQuestions.map(q => searchWeb(q, reportId))
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

        const context = await fetchAndExtract(
            uniqueResults,
            question,
            reportId
        );


        emit({ type: "stage", label: "Writing Report" })

        const result = await streamText({
            model: google("gemini-2.5-flash"),
            prompt: ` 
                    Question:
                    ${question}

                    Context:
                    ${context}

                    Instructions:
                    - Answer ONLY using the provided context.
                    - If the context is insufficient, explicitly say so.
                    - Cite the source URL after each important claim.
                    - Return markdown.`
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
        await updateReport(reportId, {
            reportMd: fullText,
            status: "done",
            tokensUsed: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
            costUsd: cost,
        });

    } catch (err) {
        console.error(err)
        throw new ApiError(400, "Error getting answer")
    }
};