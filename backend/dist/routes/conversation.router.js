import { Router } from "express";
import { getConversation, getUserConversations, getConversationReportsThread, deleteConversationById } from "../controllers/conversation.controller.js";
import { guestSessionMiddleware } from "../middlewares/guest.middleware.js";
const router = Router();
router.route('/').get(guestSessionMiddleware, getUserConversations);
router.route('/:id').get(guestSessionMiddleware, getConversation).delete(deleteConversationById);
router.route('/:id/reports').get(guestSessionMiddleware, getConversationReportsThread);
export default router;
//# sourceMappingURL=conversation.router.js.map