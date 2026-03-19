import type { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../services/jwt.service";
import { prisma } from "../services/prisma";
import { HttpError } from "../utils/httpError";

type RoleName = "USER" | "EMPLOYEE" | "MANAGER";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Request {
      user?: {
        id: number;
        username: string;
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

  let decoded: { userId: number; roleName?: string };
  try {
    decoded = verifyJwt(token, envSecret);
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { role: true },
  });

  if (!user) {
    throw new HttpError(401, "User not found");
  }

  req.user = {
    id: user.id,
    username: user.username,
    roleName: (user.role?.name ?? null) as RoleName | null,
  };

  next();
}

