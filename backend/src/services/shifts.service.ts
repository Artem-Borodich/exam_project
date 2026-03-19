import { prisma } from "./prisma";
import { createCalendarEvent } from "./googleCalendar.service";
import { HttpError } from "../utils/httpError";

export async function createShift(input: {
  zoneId: number;
  employeeId: number;
  createdById: number;
  startAt: Date;
  endAt: Date;
  timezone?: string;
}) {
  const zone = await prisma.zone.findUnique({
    where: { id: input.zoneId },
    select: { id: true, name: true },
  });
  if (!zone) throw new HttpError(404, "Zone not found");

  const employee = await prisma.user.findUnique({
    where: { id: input.employeeId },
    select: { id: true, username: true, googleRefreshToken: true },
  });
  if (!employee) throw new Error("Employee not found");

  if (!employee.googleRefreshToken) {
    // Google интеграция для календаря требует токены пользователя.
    throw new HttpError(400, "Employee has not connected Google OAuth");
  }

  const summary = `Shift: ${zone.name}`;
  const description = `Employee: ${employee.username}`;

  const calendar = await createCalendarEvent({
    userRefreshToken: employee.googleRefreshToken,
    summary,
    description,
    startAt: input.startAt,
    endAt: input.endAt,
    location: zone.name,
    timezone: input.timezone,
  });

  const shift = await prisma.shift.create({
    data: {
      zoneId: input.zoneId,
      employeeId: input.employeeId,
      createdById: input.createdById,
      startAt: input.startAt,
      endAt: input.endAt,
      googleEventId: calendar.googleEventId ?? null,
    },
    include: {
      zone: { select: { id: true, name: true } },
      employee: { select: { id: true, username: true } },
    },
  });

  return shift;
}

export async function listShifts(input: {
  viewerUserId: number;
  viewerRole: "MANAGER" | "EMPLOYEE" | "USER";
  fromAt?: Date;
  toAt?: Date;
  zoneId?: number;
  employeeId?: number;
}) {
  const where: any = {};

  if (input.fromAt || input.toAt) {
    where.startAt = {};
    if (input.fromAt) where.startAt.gte = input.fromAt;
    if (input.toAt) where.startAt.lte = input.toAt;
  }

  if (input.zoneId) where.zoneId = input.zoneId;

  if (input.viewerRole !== "MANAGER") {
    // employee sees only their own shifts
    where.employeeId = input.viewerUserId;
  } else if (input.employeeId) {
    where.employeeId = input.employeeId;
  }

  return prisma.shift.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: {
      zone: { select: { id: true, name: true } },
      employee: { select: { id: true, username: true } },
    },
  });
}

