import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { syncObservationsFromSheets } from "../services/observations.service";

export const syncObservationsHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");

    const result = await syncObservationsFromSheets({
      managerUserId: req.user.id,
    });

    res.json(result);
  }),
];

