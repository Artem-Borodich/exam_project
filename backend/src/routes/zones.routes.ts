import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { createZoneHandler, getZoneHandler, listZonesHandler } from "../controllers/zones.controller";

export const zonesRouter = Router();

zonesRouter.post("/", authMiddleware, requireRole(["MANAGER"]), ...createZoneHandler);
zonesRouter.get("/", ...listZonesHandler);
zonesRouter.get("/:id", ...getZoneHandler);

