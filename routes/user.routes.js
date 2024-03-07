import { Router } from "express";
import { loginUser, registerUser, refreshAccessToken, changePassword, logout, forgetPassword } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();



router.route('/register').post(registerUser);
router.route('/login').post(loginUser);



// secuar routes
router.route('/refresh-token').post(refreshAccessToken);
router.route("/logout").post(verifyJWT, logout)
router.route('/change-password').post(verifyJWT, changePassword);
router.route('/forget-password').post(verifyJWT, forgetPassword);


export default router;