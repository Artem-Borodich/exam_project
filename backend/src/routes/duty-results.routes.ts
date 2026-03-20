import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { getDutyResultsHandler, upsertDutyResultsHandler } from "../controllers/dutyResults.controller";

export const dutyResultsRouter = Router();

dutyResultsRouter.post(
  "/bulk",
  authMiddleware,
  requireRole(["EMPLOYEE"]),
  ...upsertDutyResultsHandler
);

dutyResultsRouter.get(
  "/duty/:dutyId",
  authMiddleware,
  requireRole(["EMPLOYEE"]),
  ...getDutyResultsHandler
);

