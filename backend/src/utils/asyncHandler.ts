import type { NextFunction, Request, Response } from "express";

/**
 * Обёртка для async handlers, чтобы не дублировать try/catch.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

