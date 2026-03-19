import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { confirmEmployeeHandler, pendingUsersHandler } from "../controllers/roles.controller";

export const rolesRouter = Router();

rolesRouter.get("/pending", authMiddleware, requireRole(["MANAGER"]), ...pendingUsersHandler);
rolesRouter.post("/confirm", authMiddleware, requireRole(["MANAGER"]), ...confirmEmployeeHandler);

