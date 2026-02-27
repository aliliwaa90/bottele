import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: num >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 2
  }).format(num);
}
