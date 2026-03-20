import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import * as authService from "../services/auth.service";
import * as googleOAuthService from "../services/googleOAuth.service";
import { prisma } from "../services/prisma";

const RegisterSchema = z.object({
  email: z.string().min(1).max(120),
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(6).max(120),
});

const LoginSchema = z.object({
  login: z.string().min(1).max(120),
  password: z.string().min(1).max(120),
});

export const register = [
  asyncHandler(async (req: Request, res: Response) => {
    const data = RegisterSchema.parse(req.body);
    const result = await authService.registerUser(data);
    res.status(201).json(result);
  }),
];

export const login = [
  asyncHandler(async (req: Request, res: Response) => {
    const data = LoginSchema.parse(req.body);
    const result = await authService.login(data);
    res.status(200).json(result);
  }),
];

export const me = [
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isApproved: true,
        createdAt: true,
      },
    });

    if (!user) throw new HttpError(401, "Unauthorized");

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      roleName: user.role ?? null,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
    });
  }),
];

export const googleStart = [
  asyncHandler(async (_req: Request, res: Response) => {
    const url = await googleOAuthService.getAuthorizationUrl();
    res.json({ url });
  }),
];

export const googleCallback = [
  asyncHandler(async (req: Request, res: Response) => {
    const code = req.query.code;
    if (typeof code !== "string" || !code) {
      throw new HttpError(400, "Missing OAuth code");
    }

    const result = await googleOAuthService.handleGoogleCallback(code);
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
    // Redirect back to a frontend page that reads token from query.
    res.redirect(`${frontendUrl}/auth/google-callback?token=${result.token}`);
  }),
];

