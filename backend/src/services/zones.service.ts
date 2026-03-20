import { prisma } from "./prisma";
import { normalizePolygon, Polygon, PolygonSchema } from "../utils/polygon";

export async function createZone(input: {
  name: string;
  polygon: Polygon;
  createdById: number;
}) {
  const polygon = normalizePolygon(input.polygon);

  // Runtime-валидация формы polygon
  PolygonSchema.parse(polygon);

  const zone = await prisma.zone.create({
    data: {
      name: input.name,
      polygonCoordinates: polygon,
      createdById: input.createdById,
    },
  });

  return zone;
}

export async function listZones() {
  return prisma.zone.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, polygonCoordinates: true, createdAt: true },
  });
}

export async function getZoneById(id: number) {
  return prisma.zone.findUnique({
    where: { id },
    select: { id: true, name: true, polygonCoordinates: true, createdAt: true },
  });
}

