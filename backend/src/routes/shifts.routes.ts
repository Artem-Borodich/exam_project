import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { createDutyHandler, listDutiesHandler } from "../controllers/shifts.controller";

export const shiftsRouter = Router();

shiftsRouter.post("/", authMiddleware, requireRole(["MANAGER"]), ...createDutyHandler);
shiftsRouter.get("/", authMiddleware, ...listDutiesHandler);

