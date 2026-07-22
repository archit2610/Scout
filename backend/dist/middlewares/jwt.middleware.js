import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import jwt from "jsonwebtoken";
import { findUserById } from "../services/user.service.js";
// export const auth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
//   const token = req.cookies?.accessToken ?? req.headers.authorization?.split(' ')[1]
//   if (!token) throw new ApiError(401, 'Login please')
//   const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as { id: string }
//   const user = await findUserById(decoded.id)
//   if (!user) throw new ApiError(404, 'User not found')
//   req.user = user
//   next()
// })
export const auth = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.accessToken ??
        req.headers.authorization?.split(" ")[1];
    if (!token) {
        throw new ApiError(401, "Login please");
    }
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new ApiError(401, "Access token expired");
        }
        throw new ApiError(401, "Invalid access token");
    }
    const user = await findUserById(decoded.id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    req.user = user;
    next();
});
//# sourceMappingURL=jwt.middleware.js.map