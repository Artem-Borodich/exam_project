import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { getEnv } from "./src/config/env";
import { apiRouter } from "./src/routes";
import { errorMiddleware } from "./src/middlewares/error.middleware";

dotenv.config();

// Validate critical env vars early
getEnv(process.env);

const env = getEnv(process.env);
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", apiRouter);

app.use(errorMiddleware);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`);
});

