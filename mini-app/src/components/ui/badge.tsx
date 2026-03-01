import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   Badge CVA definition
   Every variant ships with:
   • subtle gradient background
   • matching glow / shadow
   • inner top-highlight line (::before handled via Tailwind
     arbitrary + CSS custom property trick)
   • optional size modifier
   • optional shape modifier
───────────────────────────────────────────────────────────── */

const badgeVariants = cva(
  /* ── base ── */
  [
    "relative inline-flex items-center gap-1",
    "font-mono text-[0.68rem] font-semibold tracking-wide leading-none",
    "rounded-full px-2.5 py-1",
    "border select-none whitespace-nowrap",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",

    /* shimmer sweep on hover */
    "overflow-hidden",
    "before:absolute before:inset-0 before:translate-x-[-110%]",
    "before:bg-gradient-to-r before:from-transparent before:via-white/[0.12] before:to-transparent",
    "hover:before:translate-x-[110%] before:transition-transform before:duration-500 before:ease-in-out",
  ],
  {
    variants: {
      /* ── COLOR VARIANTS ── */
      variant: {
        /* Solid gold / ember — primary action */
        default: [
          "bg-gradient-to-r from-amber-400 to-orange-400",
          "border-amber-300/30",
          "text-amber-950 font-bold",
          "shadow-[0_0_10px_rgba(251,191,36,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]",
          "hover:shadow-[0_0_18px_rgba(251,191,36,0.55)] hover:brightness-105",
        ],

        /* Ghost gold — outlined */
        secondary: [
          "bg-amber-400/[0.08]",
          "border-amber-400/35",
          "text-amber-300",
          "shadow-[inset_0_1px_0_rgba(251,191,36,0.08)]",
          "hover:bg-amber-400/[0.14] hover:border-amber-400/55 hover:text-amber-200",
        ],

        /* Flat neutral */
        outline: [
          "bg-white/[0.04]",
          "border-white/[0.14]",
          "text-slate-300",
          "hover:bg-white/[0.08] hover:border-white/[0.22] hover:text-slate-200",
        ],

        /* Success — teal / emerald */
        success: [
          "bg-gradient-to-r from-teal-500/20 to-emerald-500/20",
          "border-teal-400/35",
          "text-teal-300",
          "shadow-[0_0_10px_rgba(20,184,166,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]",
          "hover:shadow-[0_0_16px_rgba(20,184,166,0.35)] hover:text-teal-200",
        ],

        /* Danger — crimson */
        danger: [
          "bg-gradient-to-r from-red-500/18 to-rose-500/15",
          "border-red-400/35",
          "text-red-300",
          "shadow-[0_0_8px_rgba(239,68,68,0.18),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "hover:shadow-[0_0_14px_rgba(239,68,68,0.32)] hover:text-red-200",
        ],

        /* Warning — amber soft */
        warning: [
          "bg-gradient-to-r from-yellow-500/20 to-amber-400/15",
          "border-yellow-400/35",
          "text-yellow-300",
          "shadow-[0_0_8px_rgba(234,179,8,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]",
          "hover:shadow-[0_0_14px_rgba(234,179,8,0.35)] hover:text-yellow-200",
        ],

        /* Info — violet / indigo */
        info: [
          "bg-gradient-to-r from-violet-500/20 to-indigo-500/15",
          "border-violet-400/35",
          "text-violet-300",
          "shadow-[0_0_8px_rgba(139,92,246,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]",
          "hover:shadow-[0_0_14px_rgba(139,92,246,0.35)] hover:text-violet-200",
        ],

        /* Live / Online — animated pulse */
        live: [
          "bg-gradient-to-r from-green-500/20 to-emerald-400/15",
          "border-green-400/40",
          "text-green-300",
          "shadow-[0_0_10px_rgba(34,197,94,0.22)]",
        ],

        /* Premium / Gold solid luxury */
        premium: [
          "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500",
          "border-yellow-200/40",
          "text-yellow-950 font-black tracking-wider",
          "shadow-[0_0_14px_rgba(251,191,36,0.5),inset_0_1px_0_rgba(255,255,255,0.35)]",
          "hover:shadow-[0_0_24px_rgba(251,191,36,0.7)] hover:brightness-110",
        ],

        /* Cyan accent */
        cyan: [
          "bg-gradient-to-r from-cyan-500/18 to-sky-500/15",
          "border-cyan-400/35",
          "text-cyan-300",
          "shadow-[0_0_8px_rgba(6,182,212,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]",
          "hover:shadow-[0_0_14px_rgba(6,182,212,0.32)] hover:text-cyan-200",
        ],

        /* Pink / Hot */
        hot: [
          "bg-gradient-to-r from-fuchsia-500/20 to-pink-500/15",
          "border-fuchsia-400/35",
          "text-fuchsia-300",
          "shadow-[0_0_8px_rgba(217,70,239,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]",
          "hover:shadow-[0_0_14px_rgba(217,70,239,0.35)] hover:text-fuchsia-200",
        ],
      },

      /* ── SIZE ── */
      size: {
        xs:  "text-[0.58rem] px-1.5 py-0.5 gap-0.5",
        sm:  "text-[0.64rem] px-2   py-0.5",
        md:  "",          /* default — already in base */
        lg:  "text-[0.76rem] px-3   py-1.5 gap-1.5",
      },

      /* ── SHAPE ── */
      shape: {
        pill:   "rounded-full",       /* default */
        soft:   "rounded-lg",
        square: "rounded-md",
        sharp:  "rounded-none",
      },

      /* ── DOT (colored dot prefix) ── */
      dot: {
        true:  "pl-2",
        false: "",
      },

      /* ── GLOW INTENSITY ── */
      glow: {
        none:   "",
        subtle: "",                   /* handled per-variant */
        strong: "[&]:hover:scale-105",
      },
    },

    defaultVariants: {
      variant: "default",
      size:    "md",
      shape:   "pill",
      dot:     false,
      glow:    "subtle",
    },
  }
);

/* ─────────────────────────────────────────────────────────────
   Dot color map (keyed to variant)
───────────────────────────────────────────────────────────── */
const DOT_COLOR: Record<string, string> = {
  default:   "bg-amber-800",
  secondary: "bg-amber-400",
  outline:   "bg-slate-400",
  success:   "bg-teal-400",
  danger:    "bg-red-400",
  warning:   "bg-yellow-400",
  info:      "bg-violet-400",
  live:      "bg-green-400 animate-pulse",
  premium:   "bg-yellow-800",
  cyan:      "bg-cyan-400",
  hot:       "bg-fuchsia-400",
};

/* ─────────────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────────────── */
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Show a colored dot before the label */
  dot?: boolean;
  /** Icon element rendered before children */
  icon?: React.ReactNode;
  /** Icon element rendered after children */
  iconRight?: React.ReactNode;
  /** If true, renders as a <button> for interactive badges */
  interactive?: boolean;
  /** Aria label for screen readers when dot is used */
  dotLabel?: string;
}

/* ─────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────── */
export function Badge({
  className,
  variant = "default",
  size,
  shape,
  dot,
  glow,
  icon,
  iconRight,
  interactive = false,
  dotLabel,
  children,
  ...props
}: BadgeProps) {
  const Tag = interactive ? "button" : "span";
  const resolvedVariant = variant ?? "default";
  const dotColor = DOT_COLOR[resolvedVariant] ?? "bg-slate-400";

  return (
    <Tag
      /* biome-ignore lint/a11y/noLabelWithoutControl: badge is inline */
      className={cn(
        badgeVariants({ variant, size, shape, dot: !!dot, glow }),
        interactive && "cursor-pointer active:scale-95",
        className
      )}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      {/* Dot */}
      {dot && (
        <span
          aria-label={dotLabel}
          className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", dotColor)}
        />
      )}

      {/* Left icon */}
      {icon && (
        <span className="inline-flex shrink-0 items-center [&>svg]:h-3 [&>svg]:w-3">
          {icon}
        </span>
      )}

      {/* Label */}
      {children}

      {/* Right icon */}
      {iconRight && (
        <span className="inline-flex shrink-0 items-center [&>svg]:h-3 [&>svg]:w-3">
          {iconRight}
        </span>
      )}
    </Tag>
  );
}

/* ─────────────────────────────────────────────────────────────
   Convenience sub-components
───────────────────────────────────────────────────────────── */

/** Pre-wired "LIVE" badge with animated dot */
export function LiveBadge({ className, children = "Live", ...props }: Omit<BadgeProps, "variant" | "dot">) {
  return (
    <Badge variant="live" dot dotLabel="Online indicator" className={className} {...props}>
      {children}
    </Badge>
  );
}

/** Pre-wired "NEW" badge */
export function NewBadge({ className, children = "New", ...props }: Omit<BadgeProps, "variant">) {
  return (
    <Badge variant="hot" className={className} {...props}>
      {children}
    </Badge>
  );
}

/** Pre-wired "Premium" crown badge */
export function PremiumBadge({ className, children = "Premium", ...props }: Omit<BadgeProps, "variant">) {
  return (
    <Badge variant="premium" className={className} {...props}>
      {children}
    </Badge>
  );
}

/** Status badge — maps status string → variant automatically */
export type StatusValue = "online" | "offline" | "busy" | "away" | "error" | "pending";
const STATUS_MAP: Record<StatusValue, BadgeProps["variant"]> = {
  online:  "success",
  offline: "outline",
  busy:    "danger",
  away:    "warning",
  error:   "danger",
  pending: "info",
};
export function StatusBadge({ status, className, ...props }: { status: StatusValue } & Omit<BadgeProps, "variant" | "dot">) {
  return (
    <Badge variant={STATUS_MAP[status]} dot dotLabel={status} className={className} {...props}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}