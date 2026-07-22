import { ApiError } from "../utils/api-error.js";
import { fetchAndExtract } from "../lib/reader.js";
import { searchWeb } from "../lib/searcher.js";
import { planResearch } from "../lib/planner.js";
import { writerReport } from "../lib/writer.js";
import { withTimeout } from "../utils/timeout.js";
import {
    retrieveRelevantChunks,
    buildContextBlock,
    storeReportMemory,
    type RetrievedChunk
} from "./embedding.service.js";

type Emitter = (event: object) => void;

interface ResearchOptions {
    question: string;
    conversationId?: string;
    reportId?: string;
    emit: Emitter;
}

interface RunResearchResult {
    reportMd: string;
    tokensUsed: number;
    costUsd: number;
    usedMemory: boolean;
}

export const runScout = async ({ question, conversationId, reportId, emit, }: ResearchOptions): Promise<RunResearchResult> => {
    let retrievedChunks: RetrievedChunk[] = [];

    if (conversationId) {
        emit({ type: 'stage', label: 'Retrieving context memory...' });
        retrievedChunks = await retrieveRelevantChunks(question, conversationId, 6, 0.65);
    }

    const memoryContextBlock = buildContextBlock(retrievedChunks);
    const usedMemory = retrievedChunks.length > 0;

    emit({ type: 'stage', label: 'Planning research...' });
    const plan = await withTimeout(planResearch(question, memoryContextBlock), 20000);

    let searchContext = '';

    if (plan.needsWebSearch) {
        if (plan.subQuestions.length > 5) plan.subQuestions = plan.subQuestions.slice(0, 5);
        const { subQuestions } = plan;

        emit({ type: 'plan', subQuestions });
        emit({ type: "stage", label: "Searching the web..." });

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

        emit({ type: "stage", label: "Reading web sources..." });

        searchContext = await withTimeout(
            fetchAndExtract(uniqueResults, question),
            20000,
            ""
        );
        searchContext = searchContext.slice(0, 20000);
    } else {
        emit({ type: 'stage', label: 'Answering using conversation memory...' });
    }


    const fullContext = [
        memoryContextBlock ? `## Retrieved Conversation Memory\n${memoryContextBlock}` : '',
        searchContext ? `## Web Research Context\n${searchContext}` : ''
    ].filter(Boolean).join('\n\n---\n\n');


    emit({ type: "stage", label: "Writing Report..." });
    const reportResult = await withTimeout(writerReport(question, fullContext, emit), 35000);

    if (conversationId && reportId && reportResult.reportMd) {
        emit({ type: 'stage', label: 'Saving report to memory...' });
        await storeReportMemory(reportId, conversationId, reportResult.reportMd).catch(err => {
            console.error('Failed to embed report memory:', err);
        });
    }

    return {
        ...reportResult,
        usedMemory,
    };
};