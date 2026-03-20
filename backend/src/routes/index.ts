import { Router } from "express";
import { authRouter } from "./auth.routes";
import { zonesRouter } from "./zones.routes";
import { shiftsRouter } from "./shifts.routes";
import { rolesRouter } from "./roles.routes";
import { reportsRouter } from "./reports.routes";
import { dutyResultsRouter } from "./duty-results.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/zones", zonesRouter);
apiRouter.use("/duties", shiftsRouter);
apiRouter.use("/roles", rolesRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/duty-results", dutyResultsRouter);

