import { prisma } from "./prisma";
import { createGoogleDocWithText } from "./googleDocs.service";
import { HttpError } from "../utils/httpError";

type Aggregation = {
  zoneName: string;
  records: number;
  averages: Record<string, number>;
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function computeAverages(observations: Array<{ metrics: any }>): Record<string, number> {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const obs of observations) {
    const metrics = obs.metrics;
    if (!metrics || typeof metrics !== "object") continue;

    for (const [k, v] of Object.entries(metrics)) {
      if (isFiniteNumber(v)) {
        sums[k] = (sums[k] ?? 0) + v;
        counts[k] = (counts[k] ?? 0) + 1;
      }
    }
  }

  const averages: Record<string, number> = {};
  for (const [k, sum] of Object.entries(sums)) {
    averages[k] = sum / Math.max(1, counts[k] ?? 1);
  }
  return averages;
}

export async function generateReport(input: {
  managerUserId: number;
  fromAt: Date;
  toAt: Date;
  zoneIds: number[];
}) {
  if (input.zoneIds.length === 0) throw new HttpError(400, "zoneIds is empty");
  if (input.fromAt > input.toAt) throw new HttpError(400, "Invalid period");

  const manager = await prisma.user.findUnique({
    where: { id: input.managerUserId },
    select: { id: true, username: true, googleRefreshToken: true },
  });

  if (!manager) throw new HttpError(401, "Unauthorized");
  if (!manager.googleRefreshToken) {
    throw new HttpError(400, "Manager has not connected Google OAuth");
  }

  const zones = (await prisma.zone.findMany({
    where: { id: { in: input.zoneIds } },
    select: { id: true, name: true },
  })) as Array<{ id: number; name: string }>;
  const zoneNameById = new Map<number, string>(zones.map((z) => [z.id, z.name]));

  const observations = await prisma.observation.findMany({
    where: {
      zoneId: { in: input.zoneIds },
      intervalStart: { gte: input.fromAt, lte: input.toAt },
    },
    orderBy: { intervalStart: "asc" },
    select: { zoneId: true, intervalStart: true, metrics: true },
  });

  const byZone = new Map<number, Array<{ metrics: any }>>();
  for (const o of observations) {
    const list = byZone.get(o.zoneId) ?? [];
    list.push({ metrics: o.metrics });
    byZone.set(o.zoneId, list);
  }

  const aggregations: Aggregation[] = [];
  for (const zoneId of input.zoneIds) {
    const list = byZone.get(zoneId) ?? [];
    const zoneName = zoneNameById.get(zoneId) ?? `Zone #${zoneId}`;
    aggregations.push({
      zoneName,
      records: list.length,
      averages: computeAverages(list),
    });
  }

  // Текст отчета для Google Docs
  const title = `Report: ${input.fromAt.toISOString().slice(0, 10)} - ${input.toAt
    .toISOString()
    .slice(0, 10)}`;

  const lines: string[] = [];
  lines.push(`Отчет по наблюдениям`);
  lines.push(`Автор: ${manager.username}`);
  lines.push(`Период: ${input.fromAt.toISOString()} .. ${input.toAt.toISOString()}`);
  lines.push(`Зоны: ${aggregations.map((a) => a.zoneName).join(", ")}`);
  lines.push(``);

  for (const agg of aggregations) {
    lines.push(`=== ${agg.zoneName} ===`);
    lines.push(`Записей (5-мин интервалов): ${agg.records}`);
    const avgKeys = Object.keys(agg.averages);
    if (avgKeys.length === 0) {
      lines.push(`Средние значения: (нет числовых метрик)`);
    } else {
      for (const k of avgKeys) {
        lines.push(`- ${k}: ${agg.averages[k].toFixed(3)}`);
      }
    }
    lines.push(``);
  }

  const text = lines.join("\n");

  const doc = await createGoogleDocWithText({
    userRefreshToken: manager.googleRefreshToken,
    title,
    text,
  });

  // Сохраняем факт генерации отчёта
  const report = await prisma.report.create({
    data: {
      createdById: manager.id,
      fromAt: input.fromAt,
      toAt: input.toAt,
      zoneIds: input.zoneIds,
      googleDocId: doc.googleDocId,
      googleDocUrl: doc.googleDocUrl,
      summary: `Report created by ${manager.username}`,
    },
    select: {
      id: true,
      createdAt: true,
      fromAt: true,
      toAt: true,
      zoneIds: true,
      googleDocUrl: true,
      googleDocId: true,
      summary: true,
    },
  });

  return { report, aggregations };
}

