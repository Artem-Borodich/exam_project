import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { generateReport } from "../services/reports.service";

const GenerateReportSchema = z.object({
  fromAt: z.string().datetime(),
  toAt: z.string().datetime(),
  zoneIds: z.array(z.number().int().positive()).min(1),
});

export const generateReportHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");
    const data = GenerateReportSchema.parse(req.body);

    const fromAt = new Date(data.fromAt);
    const toAt = new Date(data.toAt);
    if (Number.isNaN(fromAt.getTime()) || Number.isNaN(toAt.getTime())) {
      throw new HttpError(400, "Invalid fromAt/toAt");
    }

    const result = await generateReport({
      managerUserId: req.user.id,
      fromAt,
      toAt,
      zoneIds: data.zoneIds,
    });

    res.status(201).json(result);
  }),
];

