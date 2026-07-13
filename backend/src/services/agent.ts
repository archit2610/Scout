import { ApiError } from "../utils/api-error.js";
import { fetchAndExtract } from "../lib/reader.js"
import { searchWeb } from "../lib/searcher.js"
import { planResearch } from "../lib/planner.js"
import { reports } from "../db/schema.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm"
import { writerReport } from "../lib/writer.js";
import { withTimeout } from "../utils/timeout.js";

type Emitter = (event: object) => void


export const runResearch = async (reportId: string, question: string, emit: Emitter): Promise<void> => {
    let context = '';
    emit({ type: 'stage', label: 'Planning research...' })
    try {
        const plan = await withTimeout(planResearch(question, reportId), 20000)

        if (plan.needsWebSearch) {

            if (plan.subQuestions.length > 5) plan.subQuestions = plan.subQuestions.slice(0, 5);
            const { subQuestions } = plan;

            await db.update(reports).set({ subQuestions, status: "running" }).where(eq(reports.id, reportId))
            emit({ type: 'plan', subQuestions })

            const searches = await withTimeout(
                Promise.all(subQuestions.map(q => searchWeb(q, reportId))),
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
                question,
                reportId
            ), 20000, "");
            context = context.slice(0, 20000);

        }


        emit({ type: "stage", label: "Writing Report" })

        await withTimeout(writerReport(reportId, question, context, emit), 30000)

    } catch (err) {
        console.error(err)
        throw new ApiError(400, "Error getting answer")
    }
};