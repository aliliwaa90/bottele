import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { verifyToken } from "../utils/auth.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized." });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.auth = {
      userId: payload.userId,
      role: payload.role
    };
    next();
  } catch {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid token." });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth || req.auth.role !== "ADMIN") {
    res.status(StatusCodes.FORBIDDEN).json({ message: "Admin access required." });
    return;
  }
  next();
}
