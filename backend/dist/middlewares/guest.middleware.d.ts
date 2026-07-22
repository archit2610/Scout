import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            guestTempId?: string;
        }
    }
}
export declare const guestSessionMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=guest.middleware.d.ts.map