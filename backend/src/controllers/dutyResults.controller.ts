import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import {
  getDutyResultsHandlerService,
  upsertDutyResultsHandlerService,
} from "../services/duty-results.service";

const DutyResultInputSchema = z.object({
  trafficLightId: z.number().int().positive(),
  startTime: z.string().datetime(),
  greenWithCars: z.number().int().nonnegative(),
  greenWithoutCars: z.number().int().nonnegative(),
  redWithCars: z.number().int().nonnegative(),
  redWithoutCars: z.number().int().nonnegative(),
});

const BulkDutyResultsSchema = z.object({
  dutyId: z.number().int().positive(),
  records: z.array(DutyResultInputSchema).min(1),
});

export const upsertDutyResultsHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");
    const data = BulkDutyResultsSchema.parse(req.body);
    const result = await upsertDutyResultsHandlerService({
      employeeId: req.user.id,
      dutyId: data.dutyId,
      records: data.records.map((r) => ({
        trafficLightId: r.trafficLightId,
        startTime: new Date(r.startTime),
        greenWithCars: r.greenWithCars,
        greenWithoutCars: r.greenWithoutCars,
        redWithCars: r.redWithCars,
        redWithoutCars: r.redWithoutCars,
      })),
    });

    res.status(200).json(result);
  }),
];

export const getDutyResultsHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");
    const dutyId = Number(req.params.dutyId);
    if (!Number.isFinite(dutyId) || dutyId <= 0) throw new HttpError(400, "Invalid dutyId");

    const results = await getDutyResultsHandlerService({
      employeeId: req.user.id,
      dutyId,
    });

    res.json(results);
  }),
];

