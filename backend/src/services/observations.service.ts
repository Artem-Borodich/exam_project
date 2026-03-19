import { prisma } from "./prisma";
import { readSheetsValues } from "./googleSheets.service";
import { HttpError } from "../utils/httpError";

function parseMaybeDate(v: unknown) {
  if (typeof v !== "string" && !(v instanceof Date)) return null;
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseMetrics(v: unknown): any {
  if (v == null) return {};
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return {};
    try {
      return JSON.parse(trimmed);
    } catch {
      const n = Number(trimmed);
      if (!Number.isNaN(n)) return { value: n };
      return { raw: trimmed };
    }
  }
  return v;
}

export async function syncObservationsFromSheets(input: {
  managerUserId: number;
}) {
  const manager = await prisma.user.findUnique({
    where: { id: input.managerUserId },
    select: { id: true, googleRefreshToken: true, role: { select: { name: true } } },
  });

  if (!manager) throw new HttpError(401, "Unauthorized");
  if (!manager.googleRefreshToken) {
    throw new HttpError(400, "Manager has not connected Google OAuth");
  }

  // 1) Read values from sheet
  const values = await readSheetsValues({
    userRefreshToken: manager.googleRefreshToken,
  });

  // Expect columns:
  // [0] zoneName (string)
  // [1] intervalStart (ISO string or RFC3339)
  // [2] intervalEnd (optional; if omitted => intervalStart + 5m)
  // [3] metrics JSON (optional)
  const rows = values.filter((r) => Array.isArray(r) && r.length >= 2);
  if (rows.length === 0) {
    return { processed: 0, upserted: 0, skipped: 0 };
  }

  // 2) Collect zone names
  const zoneNames = Array.from(
    new Set(
      rows
        .map((r) => (typeof r[0] === "string" ? r[0].trim() : null))
        .filter((x): x is string => Boolean(x))
    )
  );

  const zones = (await prisma.zone.findMany({
    where: { name: { in: zoneNames } },
    select: { id: true, name: true },
  })) as Array<{ id: number; name: string }>;
  const zoneMap = new Map(zones.map((zone) => [zone.name, zone.id]));

  let processed = 0;
  let upserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const zoneName = typeof row[0] === "string" ? row[0].trim() : "";
    const intervalStart = parseMaybeDate(row[1]);
    const intervalEnd = parseMaybeDate(row[2]);

    if (!zoneName || !intervalStart) {
      skipped++;
      continue;
    }

    const zoneId = zoneMap.get(zoneName);
    if (!zoneId) {
      skipped++;
      continue;
    }

    const computedIntervalEnd =
      intervalEnd ?? new Date(intervalStart.getTime() + 5 * 60 * 1000);

    const metrics = parseMetrics(row[3]) as any;
    processed++;

    await prisma.observation.upsert({
      where: { zoneId_intervalStart: { zoneId, intervalStart } },
      update: { intervalEnd: computedIntervalEnd, metrics: metrics as any },
      create: {
        zoneId,
        intervalStart,
        intervalEnd: computedIntervalEnd,
        metrics: metrics as any,
      },
    });
    upserted++;
  }

  return { processed, upserted, skipped };
}

