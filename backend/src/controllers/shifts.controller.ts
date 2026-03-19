import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { createShift, listShifts } from "../services/shifts.service";

const CreateShiftSchema = z
  .object({
    zoneId: z.number().int().positive(),
    employeeId: z.number().int().positive(),

    // Вариант 1 (как в ТЗ): date + time
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),

    // Вариант 2: готовый ISO datetime
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),

    durationMinutes: z.number().int().positive().optional(),
    timezone: z.string().optional(),
  })
  .refine((v) => v.startAt || (v.date && v.time), {
    message: "Provide either startAt or (date + time)",
    path: ["startAt"],
  });

function parseStartEnd(input: z.infer<typeof CreateShiftSchema>) {
  const tz = input.timezone ?? "UTC";
  if (input.startAt) {
    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime())) throw new HttpError(400, "Invalid startAt");
    const endAt =
      input.endAt
        ? new Date(input.endAt)
        : new Date(startAt.getTime() + (input.durationMinutes ?? 480) * 60 * 1000);
    return { startAt, endAt, timezone: tz };
  }

  const date = input.date!;
  const time = input.time!;
  // Интерпретируем date+time как UTC. Для реального проекта нужно хранить timezone и делать корректный парсинг.
  const startAt = new Date(`${date}T${time}:00.000Z`);
  if (Number.isNaN(startAt.getTime())) throw new HttpError(400, "Invalid date/time");
  const endAt = input.endAt
    ? new Date(input.endAt)
    : new Date(startAt.getTime() + (input.durationMinutes ?? 480) * 60 * 1000);
  return { startAt, endAt, timezone: tz };
}

export const createShiftHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");

    const data = CreateShiftSchema.parse(req.body);
    const { startAt, endAt, timezone } = parseStartEnd(data);

    const shift = await createShift({
      zoneId: data.zoneId,
      employeeId: data.employeeId,
      createdById: req.user.id,
      startAt,
      endAt,
      timezone,
    });

    res.status(201).json(shift);
  }),
];

export const listShiftsHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");

    const fromAt = typeof req.query.fromAt === "string" ? new Date(req.query.fromAt) : undefined;
    const toAt = typeof req.query.toAt === "string" ? new Date(req.query.toAt) : undefined;

    if (fromAt && Number.isNaN(fromAt.getTime())) throw new HttpError(400, "Invalid fromAt");
    if (toAt && Number.isNaN(toAt.getTime())) throw new HttpError(400, "Invalid toAt");

    const zoneId =
      typeof req.query.zoneId === "string" ? Number(req.query.zoneId) : undefined;
    const employeeId =
      typeof req.query.employeeId === "string" ? Number(req.query.employeeId) : undefined;

    if (zoneId !== undefined && !Number.isFinite(zoneId)) throw new HttpError(400, "Invalid zoneId");
    if (employeeId !== undefined && !Number.isFinite(employeeId)) throw new HttpError(400, "Invalid employeeId");

    const shifts = await listShifts({
      viewerUserId: req.user.id,
      viewerRole: (req.user.roleName ?? "USER") as any,
      fromAt,
      toAt,
      zoneId,
      employeeId,
    });

    res.json(shifts);
  }),
];

