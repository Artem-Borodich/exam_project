import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { confirmAsEmployee, getPendingUsers } from "../services/roles.service";

const ConfirmSchema = z.object({
  userId: z.number().int().positive(),
});

export const pendingUsersHandler = [
  asyncHandler(async (_req: Request, res: Response) => {
    const users = await getPendingUsers();
    res.json(users);
  }),
];

export const confirmEmployeeHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");
    const data = ConfirmSchema.parse(req.body);

    const result = await confirmAsEmployee(data.userId);
    res.json(result);
  }),
];

