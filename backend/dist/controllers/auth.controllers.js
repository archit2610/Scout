import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { emailVerificationMailgenContent, sendEmail, forgotPasswordMailgenContent } from "../utils/mail.js";
import { findUserByEmail, findUserById, createUser, updateUser, isPasswordCorrect, generateAccessToken, generateRefreshToken, generateTemporaryToken, hashPassword, deleteuser } from '../services/user.js';
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { options } from "../utils/constants.js";
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
};
const registerUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
        throw new ApiError(400, "All fields are required");
    }
    ;
    const exsistinguser = await findUserByEmail(email);
    if (exsistinguser) {
        throw new ApiError(400, "User with same email already exsists");
    }
    const user = await createUser({
        email,
        username,
        password,
    });
    const { unHashedToken, hashedToken, tokenExpiry } = generateTemporaryToken();
    await updateUser(user.id, {
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: tokenExpiry,
    });
    await sendEmail({
        email,
        subject: "Verify your email",
        mailgenContent: emailVerificationMailgenContent(username, `/api/v1/verify/${unHashedToken}`),
    });
    const newuser = await findUserById(user.id);
    if (!newuser) {
        throw new ApiError(400, 'Error while registering new user');
    }
    res.status(200).json(new ApiResponse(200, newuser, "User registered successfully"));
    console.log(newuser.username, 'is registered successfully');
});
const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password, role } = req.body;
    if (!email || !username || !password) {
        throw new ApiError(400, "All fiels are required");
    }
    ;
    const user = await findUserByEmail(email);
    if (!user) {
        throw new ApiError(400, "User with email does not exsists");
    }
    const passwordValid = await isPasswordCorrect(password, user.password);
    if (!passwordValid)
        throw new ApiError(400, 'Incorrect password');
    if (!user.isEmailVerified) {
        throw new ApiError(400, "please verify user first");
    }
    const accessToken = await generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);
    await updateUser(user.id, { refreshToken });
    res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {
        accessToken,
        refreshToken
    }, 'User logged in succesfully'));
});
const logoutUser = asyncHandler(async (req, res) => {
    try {
        await updateUser(req.user.id, { refreshToken: undefined });
    }
    catch (err) {
        console.log(err);
    }
    res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, 'User logged out succesfully'));
});
const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;
    console.log(token);
    console.log("1");
    if (!token) {
        throw new ApiError(400, 'Invalid or Expiry token');
    }
    console.log("2");
    const hashedtoken = crypto.createHash("sha256").update(token).digest("hex");
    console.log(hashedtoken);
    //console.log(users.emailVerificationToken)
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.emailVerificationToken, hashedtoken));
    if (!user) {
        throw new ApiError(400, 'Invalid or Expiry token');
    }
    await updateUser(user.id, {
        isEmailVerified: true,
        emailVerificationToken: undefined,
        emailVerificationExpiry: undefined,
    });
    res.status(200).json(new ApiResponse(200, {}, 'user verified  successfully'));
    console.log('Is user email verified: ', user.isEmailVerified);
});
const resendEmailVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email)
        throw new ApiError(400, 'email not found');
    const user = await findUserByEmail(email);
    if (!user)
        throw new ApiError(400, 'User not found');
    const { unHashedToken, hashedToken, tokenExpiry } = generateTemporaryToken();
    await updateUser(user.id, {
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: tokenExpiry,
    });
    const username = user.username;
    await sendEmail({
        email,
        subject: "Verify your email",
        mailgenContent: emailVerificationMailgenContent(username, `/api/v1/verify/${unHashedToken}`),
    });
    res.status(200).json(new ApiResponse(200, { user }, 'Verification email sent'));
});
const resetForgottenPassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.body;
    const { token } = req.params;
    if (!token) {
        throw new ApiError(200, 'Invalid or Expired Token');
    }
    if (!newPassword) {
        throw new ApiError(200, 'Enter new password');
    }
    const hashedtoken = crypto.createHash("sha256").update(token).digest("hex");
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.forgotPasswordToken, hashedtoken));
    if (!user) {
        throw new ApiError(400, 'Invalid or Expiry token');
    }
    const hashed = await hashPassword(newPassword);
    await updateUser(user.id, {
        password: hashed,
        forgotPasswordToken: undefined,
        forgotPasswordExpiry: undefined,
    });
    res.status(200).json(new ApiResponse(200, {}, 'password changed successfully'));
    console.log('hashed password', user.password);
    console.log('unhashed password', newPassword);
});
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, 'Please login first');
    }
    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await findUserById(decoded.id);
    if (!user)
        throw new ApiError(401, 'Invalid refresh token');
    if (incomingRefreshToken !== user.refreshToken)
        throw new ApiError(401, 'Refresh token expired or already used');
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await updateUser(user.id, { refreshToken });
    res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { accessToken, refreshtoken: refreshToken }, "Access token refreshed"));
});
const forgotPasswordRequest = asyncHandler(async (req, res) => {
    const { email, username } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
        throw new ApiError(400, 'User not regisetered');
    }
    const { unHashedToken, hashedToken, tokenExpiry } = generateTemporaryToken();
    await updateUser(user.id, {
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: tokenExpiry,
    });
    await sendEmail({
        email,
        subject: "Reset your password",
        mailgenContent: forgotPasswordMailgenContent(username, `/api/v1/healthcheck/forgot-password/${unHashedToken}`),
    });
    res.status(200).json(new ApiResponse(200, {}, "Reset password link send on mail"));
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
        throw new ApiError(400, 'Invalid email');
    }
    const valid = await isPasswordCorrect(oldPassword, user.password);
    if (!valid)
        throw new ApiError(400, 'Incorrect current password');
    const hashed = await hashPassword(newPassword);
    await updateUser(user.id, { password: hashed });
    res.status(200).json(new ApiResponse(200, {}, 'Password changed successfully'));
});
const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await findUserById(req.user.id);
    res.status(200).json(new ApiResponse(200, { user }, 'User fetched succesfully'));
});
export const deleteUser = asyncHandler(async (req, res) => {
    const id = req.user.id;
    if (!id)
        throw new ApiError(400, "error while deleteing");
    const user = await deleteuser(id);
    if (!user)
        throw new ApiError(400, "error while delteing ");
    res.status(200).clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, { user }, "deleted succesfully"));
});
export { changeCurrentPassword, forgotPasswordRequest, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, resendEmailVerification, resetForgottenPassword, verifyEmail, };
//# sourceMappingURL=auth.controllers.js.map