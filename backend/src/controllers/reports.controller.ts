import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { generateDutyZoneReport } from "../services/reports.service";

const YYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;

const GenerateReportSchema = z.object({
  zoneId: z.number().int().positive(),
  fromDate: z.string().regex(YYYYMMDD),
  toDate: z.string().regex(YYYYMMDD),
});

export const generateReportHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");
    const data = GenerateReportSchema.parse(req.body);

    const fromDate = new Date(`${data.fromDate}T00:00:00.000Z`);
    const toDate = new Date(`${data.toDate}T00:00:00.000Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new HttpError(400, "Invalid fromDate/toDate");
    }

    const result = await generateDutyZoneReport({
      managerUserId: req.user.id,
      zoneId: data.zoneId,
      fromDate,
      toDate,
    });

    res.status(200).json(result);
  }),
];

