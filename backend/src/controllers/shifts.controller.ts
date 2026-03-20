import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";
import { createDuty, listDuties } from "../services/shifts.service";

const HHMM = /^\d{2}:\d{2}$/;
const YYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;

const CreateDutySchema = z.object({
  zoneId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
  date: z.string().regex(YYYYMMDD),
  startTime: z.string().regex(HHMM),
  endTime: z.string().regex(HHMM),
  timezone: z.string().optional(),
});

function hhmmToMinutes(hhmm: string) {
  const [hh, mm] = hhmm.split(":").map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function parseDutyDate(dateStr: string) {
  // date-only interpreted as UTC midnight (exam projects typically assume consistent timezone)
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, "Invalid date");
  return d;
}

export const createDutyHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");

    const data = CreateDutySchema.parse(req.body);
    const startMin = hhmmToMinutes(data.startTime);
    const endMin = hhmmToMinutes(data.endTime);
    if (startMin == null || endMin == null) throw new HttpError(400, "Invalid time interval");
    if (endMin <= startMin) throw new HttpError(400, "endTime must be after startTime");

    const duty = await createDuty({
      zoneId: data.zoneId,
      employeeId: data.employeeId,
      createdById: req.user.id,
      date: parseDutyDate(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: data.timezone,
    });

    res.status(201).json(duty);
  }),
];

export const listDutiesHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");
    if (!req.user.roleName) throw new HttpError(403, "Role required");

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

    const duties = await listDuties({
      viewerUserId: req.user.id,
      viewerRole: (req.user.roleName ?? "EMPLOYEE") as any,
      fromAt,
      toAt,
      zoneId,
      employeeId,
    });

    res.json(duties);
  }),
];

