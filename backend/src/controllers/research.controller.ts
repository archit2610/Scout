import { asyncHandler } from "../utils/async-handler.js";
import { Request, Response } from "express";
import { getReportById, updateReport } from "../services/report.service.js";
import { ApiError } from "../utils/api-error.js";
import { runScout } from "../services/agent.service.js";
import { createConversation } from "../services/conversation.service.js";

export const runReport = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    if (!token) throw new ApiError(400, "Report token is required");

    const report = await getReportById(token as string);

    if (!report || (report.userId && req.user?.id && report.userId !== req.user.id)) {
        throw new ApiError(404, "Report not found");
    }

    const reportId = report.id as string;
    let conversationId = report.conversationId;

    if (!conversationId) {
        const convoPayload: { userId?: string; guestTempId?: string } = {};
        if (req.user?.id) convoPayload.userId = req.user.id;
        if (req.guestTempId) convoPayload.guestTempId = req.guestTempId;

        const convo = await createConversation(convoPayload, report.question);
        if (!convo) throw new ApiError(400, "Failed to create conversation");
        conversationId = convo.id;
        await updateReport(reportId, { conversationId });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const emit = (data: object) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {

        const Report = await runScout({ question: report.question, conversationId, reportId, emit });

        await updateReport(reportId, {
            reportMd: Report.reportMd,
            tokensUsed: Report.tokensUsed,
            costUsd: Report.costUsd,
            status: "done",
        });
        emit({
            type: "done", conversationId, reportId
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

    const { question, conversationId: incomingConvoId } = req.body;
    const guestTempId = req.guestTempId || req.cookies?.scout_temp_id;

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

        let conversationId = incomingConvoId

        if (!conversationId) {
            const convo = await createConversation({ guestTempId }, question);
            if (!convo) throw new ApiError(400, "failed in creating new conversation");
            conversationId = convo.id;
        }


        const Report = await runScout({ question, conversationId, emit });
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