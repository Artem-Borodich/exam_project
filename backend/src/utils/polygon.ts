import { z } from "zod";

export const PointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const PolygonSchema = z.array(PointSchema).min(3);

export type Point = z.infer<typeof PointSchema>;
export type Polygon = z.infer<typeof PolygonSchema>;

/**
 * Иногда frontend присылает полигон без замыкания (последняя точка != первая).
 * Для удобства замыкаем, но не требуем это строго.
 */
export function normalizePolygon(polygon: Polygon): Polygon {
  const first = polygon[0];
  const last = polygon[polygon.length - 1];
  if (first.lat === last.lat && first.lng === last.lng) return polygon;
  return [...polygon, first];
}

