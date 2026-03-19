import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { createShiftHandler, listShiftsHandler } from "../controllers/shifts.controller";

export const shiftsRouter = Router();

shiftsRouter.post("/", authMiddleware, requireRole(["MANAGER"]), ...createShiftHandler);
shiftsRouter.get("/", authMiddleware, ...listShiftsHandler);

