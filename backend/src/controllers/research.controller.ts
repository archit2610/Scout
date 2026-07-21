import { asyncHandler } from "../utils/async-handler.js";
import { Request, Response } from "express";
import { getReportById, updateReport } from "../services/report.service.js";
import { ApiError } from "../utils/api-error.js";
import { runResearch } from "../services/agent.service.js";

export const runReport = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    if (!token) throw new ApiError(400, "error while fetching the question")

    const report = await getReportById(token as string);

    if (!report || report.userId !== req.user!.id) {
        throw new ApiError(404, "Report not found");
    }

    const reportId = report.id as string;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const emit = (data: object) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {

        const Report = await runResearch(report.question, emit);

        await updateReport(reportId, {
            reportMd: Report.reportMd,
            tokensUsed: Report.tokensUsed,
            costUsd: Report.costUsd,
            status: "done",
        });
        emit({
            type: "done",
        });
        res.end();
    } catch (err) {
        console.error(err);
        emit({
            type: "error",
            message: "Failed to generate report",
        });
        res.end()
    }
});

export const anonymousrun = asyncHandler(async (req: Request, res: Response) => {

    const { question } = req.body;

    if (!question || typeof question !== "string") {
        throw new ApiError(400, "Question is required");
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const emit = (data: object) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {

        const Report = await runResearch(question, emit);
        emit({
            type: "done",
        });
        res.end();
    } catch (err) {
        console.error(err);
        emit({
            type: "error",
            message: "Failed to generate report",
        });
        res.end()
    }
})