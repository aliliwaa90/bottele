import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import { env } from "../config/env.js";

export type AuthPayload = {
  userId: string;
  role: "USER" | "ADMIN";
};

export function signToken(payload: AuthPayload): string {
  const expiresIn = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn
  });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthPayload;
}

export function generateReferralCode(telegramId: bigint): string {
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VT${telegramId.toString().slice(-4)}${randomPart}`;
}
