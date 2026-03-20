import { prisma } from "./prisma";
import { HttpError } from "../utils/httpError";

function toHHMMToDate(dateOnlyUTC: Date, hhmm: string) {
  const yyyyMmDd = dateOnlyUTC.toISOString().slice(0, 10);
  const d = new Date(`${yyyyMmDd}T${hhmm}:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, "Invalid duty time");
  return d;
}

function isAlignedTo5Min(base: Date, value: Date) {
  const diffMs = value.getTime() - base.getTime();
  const step = 5 * 60 * 1000;
  return diffMs % step === 0;
}

export async function upsertDutyResultsHandlerService(input: {
  employeeId: number;
  dutyId: number;
  records: Array<{
    trafficLightId: number;
    startTime: Date;
    greenWithCars: number;
    greenWithoutCars: number;
    redWithCars: number;
    redWithoutCars: number;
  }>;
}) {
  const duty = await prisma.duty.findUnique({
    where: { id: input.dutyId },
    select: {
      id: true,
      employeeId: true,
      date: true,
      startTime: true,
      endTime: true,
    },
  });
  if (!duty) throw new HttpError(404, "Duty not found");
  if (duty.employeeId !== input.employeeId) throw new HttpError(403, "Not your duty");

  const dutyStart = toHHMMToDate(duty.date, duty.startTime);
  const dutyEnd = toHHMMToDate(duty.date, duty.endTime);

  // Upsert each interval record (compound unique key prevents duplicates).
  const tasks = input.records.map(async (r) => {
    if (r.startTime < dutyStart || r.startTime >= dutyEnd) {
      throw new HttpError(400, "DutyResult startTime outside duty interval");
    }
    if (!isAlignedTo5Min(dutyStart, r.startTime)) {
      throw new HttpError(400, "DutyResult startTime must be 5-minute aligned");
    }

    return prisma.dutyResult.upsert({
      where: {
        dutyId_trafficLightId_startTime: {
          dutyId: input.dutyId,
          trafficLightId: r.trafficLightId,
          startTime: r.startTime,
        },
      },
      update: {
        greenWithCars: r.greenWithCars,
        greenWithoutCars: r.greenWithoutCars,
        redWithCars: r.redWithCars,
        redWithoutCars: r.redWithoutCars,
      },
      create: {
        dutyId: input.dutyId,
        trafficLightId: r.trafficLightId,
        startTime: r.startTime,
        greenWithCars: r.greenWithCars,
        greenWithoutCars: r.greenWithoutCars,
        redWithCars: r.redWithCars,
        redWithoutCars: r.redWithoutCars,
      },
    });
  });

  const results = await Promise.all(tasks);
  return { saved: results.length };
}

export async function getDutyResultsHandlerService(input: { employeeId: number; dutyId: number }) {
  const duty = await prisma.duty.findUnique({
    where: { id: input.dutyId },
    select: { id: true, employeeId: true },
  });
  if (!duty) throw new HttpError(404, "Duty not found");
  if (duty.employeeId !== input.employeeId) throw new HttpError(403, "Not your duty");

  return prisma.dutyResult.findMany({
    where: { dutyId: input.dutyId },
    orderBy: [{ startTime: "asc" }, { trafficLightId: "asc" }],
    select: {
      id: true,
      dutyId: true,
      trafficLightId: true,
      startTime: true,
      greenWithCars: true,
      greenWithoutCars: true,
      redWithCars: true,
      redWithoutCars: true,
    },
  });
}

