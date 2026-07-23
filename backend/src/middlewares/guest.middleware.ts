import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { GUEST_COOKIE_NAME } from '../services/conversation.service.js';
import jwt from "jsonwebtoken";
import { ApiError } from '../utils/api-error.js';
import { findUserById } from '../services/user.service.js';

declare global {
    namespace Express {
        interface Request {
            guestTempId?: string;
        }
    }
}

export const guestSessionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    let tempId = req.cookies?.[GUEST_COOKIE_NAME];

    if (req.user) {
        return next();
    }

    const token =
        req.cookies?.accessToken ??
        req.headers.authorization?.split(" ")[1];

    let decoded: { id: string };

    if (token) {
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
        return next();
    }
    if (!tempId) {
        tempId = `guest_${crypto.randomUUID()}`;
        res.cookie(GUEST_COOKIE_NAME, tempId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            sameSite: 'lax',
        });
    }

    req.guestTempId = tempId;
    next();
};

