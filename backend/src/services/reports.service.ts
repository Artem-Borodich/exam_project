import { prisma } from "./prisma";
import { HttpError } from "../utils/httpError";

type DutyIntervalBucket = {
  label: string;
  startMinutes: number;
  endMinutes: number; // exclusive
};

const INTERVAL_BUCKETS: DutyIntervalBucket[] = [
  { label: "06:00–09:00", startMinutes: 6 * 60, endMinutes: 9 * 60 },
  { label: "09:00–12:00", startMinutes: 9 * 60, endMinutes: 12 * 60 },
  { label: "12:00–15:00", startMinutes: 12 * 60, endMinutes: 15 * 60 },
  { label: "15:00–18:00", startMinutes: 15 * 60, endMinutes: 18 * 60 },
  { label: "18:00–21:00", startMinutes: 18 * 60, endMinutes: 21 * 60 },
];

function toDayKeyUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

function minutesOfDayUTC(d: Date) {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function addDaysUTC(dayKey: string, add: number) {
  const base = new Date(`${dayKey}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + add);
  return base.toISOString().slice(0, 10);
}

export async function generateDutyZoneReport(input: {
  managerUserId: number;
  zoneId: number;
  fromDate: Date;
  toDate: Date;
}) {
  if (input.zoneId <= 0) throw new HttpError(400, "Invalid zoneId");
  if (input.fromDate > input.toDate) throw new HttpError(400, "Invalid date range");

  const manager = await prisma.user.findUnique({
    where: { id: input.managerUserId },
    select: { id: true, role: true },
  });
  if (!manager || manager.role !== "MANAGER") throw new HttpError(401, "Unauthorized");

  const zone = await prisma.zone.findUnique({
    where: { id: input.zoneId },
    select: { id: true, name: true },
  });
  if (!zone) throw new HttpError(404, "Zone not found");

  const fromDayKey = toDayKeyUTC(input.fromDate);
  const toDayKey = toDayKeyUTC(input.toDate);

  const fromAt = new Date(`${fromDayKey}T00:00:00.000Z`);
  const toAtExclusive = new Date(`${addDaysUTC(toDayKey, 1)}T00:00:00.000Z`);

  const dutyResults = await prisma.dutyResult.findMany({
    where: {
      duty: { zoneId: input.zoneId },
      startTime: { gte: fromAt, lt: toAtExclusive },
    },
    select: {
      startTime: true,
      greenWithCars: true,
      greenWithoutCars: true,
      redWithCars: true,
      redWithoutCars: true,
    },
  });

  // Initialize all days in range with zeroes.
  const days: string[] = [];
  const fromDateObj = new Date(fromAt);
  const toDateObj = new Date(toAtExclusive);
  for (let d = 0; d < Math.ceil((toDateObj.getTime() - fromDateObj.getTime()) / (24 * 60 * 60 * 1000)); d++) {
    days.push(addDaysUTC(fromDayKey, d));
  }

  const emptyBucket = () => ({
    greenWithCars: 0,
    greenWithoutCarsPlusRedWithoutCars: 0,
    redWithCars: 0,
  });

  const reportByDay: Record<
    string,
    { day: string; buckets: Array<ReturnType<typeof emptyBucket>> }
  > = {};

  for (const dayKey of days) {
    reportByDay[dayKey] = {
      day: dayKey,
      buckets: INTERVAL_BUCKETS.map(() => emptyBucket()),
    };
  }

  for (const dr of dutyResults) {
    const dayKey = toDayKeyUTC(dr.startTime);
    const minute = minutesOfDayUTC(dr.startTime);

    const reportDay = reportByDay[dayKey];
    if (!reportDay) continue; // outside requested range (shouldn't happen)

    const bucketIndex = INTERVAL_BUCKETS.findIndex(
      (b) => minute >= b.startMinutes && minute < b.endMinutes
    );
    if (bucketIndex === -1) continue; // outside 06:00–21:00

    const bucket = reportDay.buckets[bucketIndex];
    bucket.greenWithCars += dr.greenWithCars;
    bucket.greenWithoutCarsPlusRedWithoutCars += dr.greenWithoutCars + dr.redWithoutCars;
    bucket.redWithCars += dr.redWithCars;
  }

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    fromDate: fromDayKey,
    toDate: toDayKey,
    intervals: INTERVAL_BUCKETS.map((b) => ({ label: b.label })),
    days: days.map((d) => reportByDay[d]),
  };
}

