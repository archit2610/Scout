import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import jwt from "jsonwebtoken";
import { findUserById } from "../services/user.service.js";
import { User } from "../db/schema.js"

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export const auth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ??
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new ApiError(401, "Login please");
    }

    let decoded: { id: string };

    try {
      decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET!
      ) as { id: string };
    } catch (error) {
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
  }
);