import { asyncHandler } from "../utils/async-handler.js";
import { getReportById, updateReport } from "../services/report.js";
import { ApiError } from "../utils/api-error.js";
import { runResearch } from "../services/agent.js";
import { ApiResponse } from "../utils/api-response.js";
export const runReport = asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token)
        throw new ApiError(400, "error while fetching the question");
    const report = await getReportById(token);
    if (!report || report.userId !== req.user.id) {
        throw new ApiError(404, "Report not found");
    }
    const reportId = report.id;
    await updateReport(reportId, {
        status: "running",
    });
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const emit = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    try {
        emit({
            type: "stage",
            label: "Searching web..."
        });
        const result = await runResearch(reportId, report.question, emit);
        const answer = report.reportMd;
        console.log(answer);
        emit({
            type: "done",
        });
        res.status(200).json(new ApiResponse(200, "Query executed succcessfully"));
    }
    catch (err) {
        console.error(err);
        emit({
            type: "error",
            message: "Failed to generate report",
        });
    }
});
//# sourceMappingURL=research.controller.js.map