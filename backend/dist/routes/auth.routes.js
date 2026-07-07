import { Router } from "express";
import { registerUser, loginUser, logoutUser, verifyEmail, resendEmailVerification, forgotPasswordRequest, resetForgottenPassword, changeCurrentPassword, refreshAccessToken, getCurrentUser, deleteUser } from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import { userChangeCurrentPasswordValidator, userForgotPasswordValidator, userLoginValidator, userRegisterValidator, userResetForgottenPasswordValidator, } from "../validators/index.js";
import { auth } from "../middlewares/jwt.middleware.js";
const router = Router();
router.route("/register").post(userRegisterValidator(), validate, registerUser);
router.route("/login").post(userLoginValidator(), validate, loginUser);
router.route("/logout").get(auth, logoutUser);
router.route("/verify/:token").get(verifyEmail);
router.route("/resend-emailverification").post(resendEmailVerification);
router.route("/forgot-password").post(userForgotPasswordValidator(), validate, forgotPasswordRequest);
router.route("/forgot-password/:token").post(userResetForgottenPasswordValidator(), validate, resetForgottenPassword);
router.route("/change-currentpassword").post(userChangeCurrentPasswordValidator(), validate, changeCurrentPassword);
router.route("/refresh-accesstoken").get(auth, refreshAccessToken);
router.route("/profile").get(auth, getCurrentUser);
router.route("/delete-user").get(auth, deleteUser);
export default router;
//# sourceMappingURL=auth.routes.js.map