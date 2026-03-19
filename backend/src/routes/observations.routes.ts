import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { syncObservationsHandler } from "../controllers/observations.controller";

export const observationsRouter = Router();

observationsRouter.post("/sync", authMiddleware, requireRole(["MANAGER"]), ...syncObservationsHandler);

