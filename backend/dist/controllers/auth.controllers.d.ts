import { Request, Response } from "express";
import { User } from "../db/schema.js";
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}
declare const registerUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
declare const loginUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
declare const logoutUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
declare const verifyEmail: (req: Request, res: Response, next: import("express").NextFunction) => void;
declare const resendEmailVerification: (req: Request, res: Response, next: import("express").NextFunction) => void;
declare const resetForgottenPassword: (req: Request, res: Response, next: import("express").NextFunction) => void;
declare const refreshAccessToken: (req: Request, res: Response, next: import("express").NextFunction) => void;
declare const forgotPasswordRequest: (req: Request, res: Response, next: import("express").NextFunction) => void;
declare const changeCurrentPassword: (req: Request, res: Response, next: import("express").NextFunction) => void;
declare const getCurrentUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const deleteUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
export { changeCurrentPassword, forgotPasswordRequest, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, resendEmailVerification, resetForgottenPassword, verifyEmail, };
//# sourceMappingURL=auth.controllers.d.ts.map