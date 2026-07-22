import express from "express";
import cookieparser from "cookie-parser";
import cors from "cors";
import Authentication from "./routes/auth.routes.js";
import Reports from "./routes/report.router.js";
import Conversation from "./routes/conversation.router.js";
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieparser());
app.use("/api/v1/", Authentication);
app.use("/api/v1/auth/", Reports);
app.use("/api/v1/coversation/", Conversation);
app.use((err, req, res, next) => {
    const status = err.statusCode ?? 500;
    res.status(status).json({ success: false, message: err.message, errors: err.errors });
});
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Backend is running 🚀",
    });
});
export default app;
//# sourceMappingURL=app.js.map