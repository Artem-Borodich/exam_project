import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // eslint-disable-next-line no-console
  console.error(err);

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
    });
  }

  return res.status(500).json({
    message: "Internal server error",
  });
}

