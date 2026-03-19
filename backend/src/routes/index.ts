import { Router } from "express";
import { authRouter } from "./auth.routes";
import { zonesRouter } from "./zones.routes";
import { shiftsRouter } from "./shifts.routes";
import { rolesRouter } from "./roles.routes";
import { observationsRouter } from "./observations.routes";
import { reportsRouter } from "./reports.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/zones", zonesRouter);
apiRouter.use("/shifts", shiftsRouter);
apiRouter.use("/roles", rolesRouter);
apiRouter.use("/observations", observationsRouter);
apiRouter.use("/reports", reportsRouter);

