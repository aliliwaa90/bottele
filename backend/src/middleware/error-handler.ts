import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation error.",
      issues: error.issues
    });
    return;
  }

  if (error instanceof Error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message
    });
    return;
  }

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Unexpected server error." });
}
