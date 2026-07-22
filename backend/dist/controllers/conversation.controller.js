import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { getConversationsByOwner, getConversationById, getConversationReports, deleteConversation } from "../services/conversation.service.js";
;
export const getUserConversations = asyncHandler(async (req, res) => {
    const guestTempId = req.guestTempId || req.cookies?.scout_temp_id;
    const owner = {};
    if (req.user?.id)
        owner.userId = req.user.id;
    if (guestTempId)
        owner.guestTempId = guestTempId;
    const convos = await getConversationsByOwner(owner);
    res.status(200).json(new ApiResponse(200, { conversations: convos }, "Conversations fetched successfully"));
});
export const getConversation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new ApiError(400, "Conversation ID is required");
    const convo = await getConversationById(id);
    if (!convo)
        throw new ApiError(404, "Conversation not found");
    res.status(200).json(new ApiResponse(200, { conversation: convo }, "Conversation fetched successfully"));
});
export const getConversationReportsThread = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new ApiError(400, "Conversation ID is required");
    const reportsList = await getConversationReports(id);
    res.status(200).json(new ApiResponse(200, { reports: reportsList }, "Thread history fetched successfully"));
});
export const deleteConversationById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new ApiError(400, "Conversation ID is required");
    const deleted = await deleteConversation(id);
    res.status(200).json(new ApiResponse(200, { conversation: deleted }, "Conversation deleted successfully"));
});
//# sourceMappingURL=conversation.controller.js.map