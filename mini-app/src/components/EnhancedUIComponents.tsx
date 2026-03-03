/**
 * Enhanced UI Components
 * - Animated cards with better visual hierarchy
 * - Premium gradients and effects
 * - Optimized for performance
 */

import React, { memo, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "gold" | "cyan" | "violet" | "elevated";
  hover?: "lift" | "glow" | "none";
  animation?: boolean;
}

/**
 * Premium card with consistent styling and animations
 */
export const PremiumCard = memo(function PremiumCard({
  children,
  className,
  variant = "default",
  hover = "lift",
  animation = true,
}: PremiumCardProps) {
  const variantClasses = {
    default: "bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-slate-700/40",
    gold: "bg-gradient-to-br from-amber-950/40 to-slate-900/30 border-amber-600/30",
    cyan: "bg-gradient-to-br from-cyan-950/40 to-slate-900/30 border-cyan-500/30",
    violet: "bg-gradient-to-br from-violet-950/40 to-slate-900/30 border-violet-500/30",
    elevated: "bg-gradient-to-br from-slate-800/70 to-slate-900/50 border-slate-600/50 shadow-2xl",
  };

  const hoverClasses = {
    lift: "hover:shadow-2xl hover:-translate-y-2 transition-all duration-300",
    glow: "hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300",
    none: "",
  };

  return (
    <motion.div
      className={cn(
        "rounded-xl border backdrop-blur-sm overflow-hidden",
        variantClasses[variant],
        hoverClasses[hover],
        className
      )}
      initial={animation ? { opacity: 0, y: 12 } : false}
      animate={animation ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
});

/**
 * Animated stat display with counter
 */
export interface AnimatedStatProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: "gold" | "cyan" | "emerald" | "violet" | "rose";
  trend?: "up" | "down" | "neutral";
}

const colorClasses = {
  gold: "text-amber-400",
  cyan: "text-cyan-400",
  emerald: "text-emerald-400",
  violet: "text-violet-400",
  rose: "text-rose-400",
};

export const AnimatedStat = memo(function AnimatedStat({
  label,
  value,
  icon,
  color = "gold",
  trend,
}: AnimatedStatProps) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-800/40 border border-slate-700/40">
      {icon && <div className={cn("text-2xl", colorClasses[color])}>{icon}</div>}
      <div className={cn("text-sm font-bold", colorClasses[color])}>{label}</div>
      <motion.div
        className="font-mono text-xl font-bold text-slate-100"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.div>
      {trend && (
        <div
          className={cn(
            "text-xs font-bold uppercase",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-rose-400",
            trend === "neutral" && "text-slate-400"
          )}
        >
          {trend === "up" && "↑"}
          {trend === "down" && "↓"}
          {trend === "neutral" && "→"}
        </div>
      )}
    </div>
  );
});

/**
 * Shimmer loading effect
 */
export const ShimmerLoader = memo(function ShimmerLoader() {
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-16 bg-slate-700/40 rounded-lg" />
      ))}
    </div>
  );
});

/**
 * Glowing badge for highlights
 */
export interface GlowingBadgeProps {
  children: ReactNode;
  color?: "gold" | "cyan" | "emerald" | "violet";
}

const glowClasses = {
  gold: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/20",
  cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/20",
  emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/20",
  violet: "bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-lg shadow-violet-500/20",
};

export const GlowingBadge = memo(function GlowingBadge({
  children,
  color = "gold",
}: GlowingBadgeProps) {
  return (
    <motion.span
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold",
        glowClasses[color]
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.span>
  );
});

/**
 * Progress ring with animation
 */
export interface ProgressRingProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

export const ProgressRing = memo(function ProgressRing({
  value,
  max = 100,
  label,
  color = "#fbbf24",
  size = "md",
}: ProgressRingProps) {
  const percentage = (value / max) * 100;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;

  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-48 h-48",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", sizeClasses[size])}>
      <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-white">{Math.round(percentage)}%</div>
        {label && <div className="text-xs text-slate-400">{label}</div>}
      </div>
    </div>
  );
});
