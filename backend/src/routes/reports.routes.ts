import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { generateReportHandler } from "../controllers/reports.controller";

export const reportsRouter = Router();

reportsRouter.post("/generate", authMiddleware, requireRole(["MANAGER"]), ...generateReportHandler);

