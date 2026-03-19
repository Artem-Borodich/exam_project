import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { register, login, me, googleStart, googleCallback } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/register", ...register);
authRouter.post("/login", ...login);
authRouter.get("/me", authMiddleware, ...me);

// Google OAuth (authorization code flow)
authRouter.get("/google/start", ...googleStart);
authRouter.get("/google/callback", ...googleCallback);

