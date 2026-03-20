import type { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../services/jwt.service";
import { prisma } from "../services/prisma";
import { HttpError } from "../utils/httpError";

type RoleName = "EMPLOYEE" | "MANAGER";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Request {
      user?: {
        id: number;
        email: string;
        roleName: RoleName | null;
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Authorization header missing");
  }

  const token = authHeader.slice("Bearer ".length).trim();

  const envSecret = process.env.JWT_SECRET;
  if (!envSecret) {
    throw new HttpError(500, "JWT_SECRET is not configured");
  }

  let decoded: { userId: number; role?: string };
  try {
    decoded = verifyJwt(token, envSecret);
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, isApproved: true, name: true },
  });

  if (!user) {
    throw new HttpError(401, "User not found");
  }

  req.user = {
    id: user.id,
    email: user.email,
    roleName: (user.role ?? null) as RoleName | null,
  };

  next();
}

