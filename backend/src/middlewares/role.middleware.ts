import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

type RoleName = "EMPLOYEE" | "MANAGER";

export function requireRole(allowed: RoleName[]) {
  return function (req: Request, _res: Response, next: NextFunction) {
    const roleName = req.user?.roleName ?? null;
    if (!roleName) {
      throw new HttpError(403, "Role required");
    }

    if (!allowed.includes(roleName)) {
      throw new HttpError(403, "Insufficient permissions");
    }

    next();
  };
}

