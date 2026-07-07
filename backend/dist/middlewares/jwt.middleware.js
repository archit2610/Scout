import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import jwt from "jsonwebtoken";
import { findUserById } from "../services/user.js";
export const auth = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.accessToken ?? req.headers.authorization?.split(' ')[1];
    if (!token)
        throw new ApiError(401, 'Login please');
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await findUserById(decoded.id);
    if (!user)
        throw new ApiError(404, 'User not found');
    req.user = user;
    next();
});
//# sourceMappingURL=jwt.middleware.js.map