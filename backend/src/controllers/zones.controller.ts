import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { createZone, getZoneById, listZones } from "../services/zones.service";
import { PointSchema } from "../utils/polygon";
import { HttpError } from "../utils/httpError";

const CreateZoneSchema = z.object({
  name: z.string().min(1).max(80),
  polygon: z.array(PointSchema).min(3),
});

export const createZoneHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");
    const data = CreateZoneSchema.parse(req.body);
    const zone = await createZone({
      name: data.name,
      polygon: data.polygon,
      createdById: req.user.id,
    });
    res.status(201).json(zone);
  }),
];

export const listZonesHandler = [
  asyncHandler(async (_req: Request, res: Response) => {
    const zones = await listZones();
    res.json(zones);
  }),
];

export const getZoneHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new HttpError(400, "Invalid id");
    const zone = await getZoneById(id);
    if (!zone) throw new HttpError(404, "Zone not found");
    res.json(zone);
  }),
];

