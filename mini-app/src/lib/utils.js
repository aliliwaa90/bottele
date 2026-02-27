import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function formatNumber(value) {
    const num = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(num))
        return "0";
    return new Intl.NumberFormat("en-US", {
        notation: num >= 1000 ? "compact" : "standard",
        maximumFractionDigits: 2
    }).format(num);
}
