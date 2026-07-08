import { google } from "@ai-sdk/google";
import { streamText } from "ai";

import { asyncHandler } from "../utils/async-handler.js";
import { Request, Response } from "express";
import { getReportById, updateReport } from "../services/report.js";
import { ApiError } from "../utils/api-error.js";

export const runReport = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    const report = await getReportById(token as string);

    if (!report || report.userId !== req.user!.id) {
        throw new ApiError(404, "Report not found");
    }

    const reportId = report.id as string;

    await updateReport(reportId, {
        status: "running",
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (data: object) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        send({
            type: "stage",
            label: "Generating answer...",
        });

        let fullText = "";

        const result = streamText({
            model: google("gemini-2.5-flash"),
            system: "You are a helpful research assistant.Answer thoroughly using markdown",
            prompt: report.question,
        });

        for await (const chunk of result.textStream) {
            fullText += chunk;

            send({
                type: "token",
                data: chunk,
            });
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

        send({
            type: "done",
        });

        res.end();
    } catch (err) {
        console.error(err);

        await updateReport(reportId, {
            status: "error",
        });

        send({
            type: "error",
            message: "Failed to generate report",
        });

        res.end();
    }
});