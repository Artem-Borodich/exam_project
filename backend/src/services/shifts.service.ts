import { prisma } from "./prisma";
import { createCalendarEvent } from "./googleCalendar.service";
import { HttpError } from "../utils/httpError";

export async function createDuty(input: {
  zoneId: number;
  employeeId: number;
  createdById: number;
  date: Date; // date-only (midnight UTC)
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  timezone?: string;
}) {
  const zone = await prisma.zone.findUnique({
    where: { id: input.zoneId },
    select: { id: true, name: true },
  });
  if (!zone) throw new HttpError(404, "Zone not found");

  const employee = await prisma.user.findUnique({
    where: { id: input.employeeId },
    select: { id: true, email: true, role: true, isApproved: true, googleRefreshToken: true },
  });
  if (!employee) throw new HttpError(404, "Employee not found");
  if (employee.role !== "EMPLOYEE" || !employee.isApproved) {
    throw new HttpError(400, "User is not an approved employee");
  }

  // Optional: create calendar event for the duty (if employee connected Google).
  if (employee.googleRefreshToken) {
    const startAt = new Date(`${input.date.toISOString().slice(0, 10)}T${input.startTime}:00.000Z`);
    const endAt = new Date(`${input.date.toISOString().slice(0, 10)}T${input.endTime}:00.000Z`);

    await createCalendarEvent({
      userRefreshToken: employee.googleRefreshToken,
      summary: `Duty: ${zone.name}`,
      description: `Employee: ${employee.email}`,
      startAt,
      endAt,
      location: zone.name,
      timezone: input.timezone ?? "UTC",
      reminders: [
        { method: "popup", minutes: 60 * 24 }, // 1 day before
        { method: "popup", minutes: 60 }, // 1 hour before
      ],
    });
  }

  const duty = await prisma.duty.create({
    data: {
      zoneId: input.zoneId,
      employeeId: input.employeeId,
      createdById: input.createdById,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    },
    include: {
      zone: { select: { id: true, name: true } },
      employee: { select: { id: true, email: true } },
    },
  });

  return duty;
}

export async function listDuties(input: {
  viewerUserId: number;
  viewerRole: "MANAGER" | "EMPLOYEE";
  fromAt?: Date;
  toAt?: Date;
  zoneId?: number;
  employeeId?: number;
}) {
  const where: any = {};

  if (input.fromAt || input.toAt) {
    where.date = {};
    if (input.fromAt) where.date.gte = input.fromAt;
    if (input.toAt) where.date.lte = input.toAt;
  }

  if (input.zoneId) where.zoneId = input.zoneId;

  if (input.viewerRole !== "MANAGER") {
    where.employeeId = input.viewerUserId;
  } else if (input.employeeId) {
    where.employeeId = input.employeeId;
  }

  return prisma.duty.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: {
      zone: { select: { id: true, name: true } },
      employee: { select: { id: true, email: true } },
    },
  });
}

