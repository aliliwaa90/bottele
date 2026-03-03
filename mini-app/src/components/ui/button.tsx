import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════
   BUTTON VARIANTS
═══════════════════════════════════════════════════════════ */

const buttonVariants = cva(
  /* ── Base ── */
  [
    "relative inline-flex items-center justify-center gap-2",
    "whitespace-nowrap select-none",
    "font-mono text-sm font-bold tracking-wide",
    "rounded-xl border",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed",
    "active:scale-[0.96]",

    /* Shimmer sweep on hover */
    "overflow-hidden",
    "after:absolute after:inset-0",
    "after:translate-x-[-115%] hover:after:translate-x-[115%]",
    "after:bg-gradient-to-r after:from-transparent after:via-white/[0.13] after:to-transparent",
    "after:transition-transform after:duration-500 after:ease-in-out",
    "after:pointer-events-none",
  ],

  {
    variants: {
      variant: {
        /* ── Ember Gold — primary CTA ── */
        default: [
          "bg-[linear-gradient(135deg,#ffe066_0%,#f5a623_42%,#e85d04_100%)]",
          "border-amber-300/25",
          "text-amber-950",
          "shadow-[0_4px_20px_rgba(245,166,35,0.4),0_1px_4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.28)]",
          "hover:shadow-[0_6px_28px_rgba(245,166,35,0.58),0_2px_8px_rgba(0,0,0,0.45)] hover:brightness-105",
          "focus-visible:ring-amber-400",
        ],

        /* ── Violet / Indigo ── */
        violet: [
          "bg-[linear-gradient(135deg,#a78bfa_0%,#8b5cf6_45%,#6d28d9_100%)]",
          "border-violet-400/20",
          "text-white",
          "shadow-[0_4px_20px_rgba(139,92,246,0.4),0_1px_4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.18)]",
          "hover:shadow-[0_6px_28px_rgba(139,92,246,0.55)] hover:brightness-105",
          "focus-visible:ring-violet-400",
        ],

        /* ── Teal / Cyan ── */
        teal: [
          "bg-[linear-gradient(135deg,#5eead4_0%,#0fd4bc_45%,#0891b2_100%)]",
          "border-teal-300/20",
          "text-teal-950 font-extrabold",
          "shadow-[0_4px_20px_rgba(15,212,188,0.38),0_1px_4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.25)]",
          "hover:shadow-[0_6px_28px_rgba(15,212,188,0.52)] hover:brightness-105",
          "focus-visible:ring-teal-400",
        ],

        /* ── Crimson / Danger ── */
        danger: [
          "bg-[linear-gradient(135deg,#f87171_0%,#ef4444_45%,#b91c1c_100%)]",
          "border-red-300/20",
          "text-white",
          "shadow-[0_4px_20px_rgba(239,68,68,0.38),0_1px_4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.18)]",
          "hover:shadow-[0_6px_28px_rgba(239,68,68,0.52)] hover:brightness-105",
          "focus-visible:ring-red-400",
        ],

        /* ── Fuchsia / Hot ── */
        hot: [
          "bg-[linear-gradient(135deg,#f0abfc_0%,#d946ef_45%,#a21caf_100%)]",
          "border-fuchsia-300/20",
          "text-white",
          "shadow-[0_4px_20px_rgba(217,70,239,0.38),0_1px_4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]",
          "hover:shadow-[0_6px_28px_rgba(217,70,239,0.52)] hover:brightness-105",
          "focus-visible:ring-fuchsia-400",
        ],

        /* ── Glass / Secondary ── */
        secondary: [
          "bg-white/[0.07]",
          "border-white/[0.13]",
          "text-slate-200",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_8px_rgba(0,0,0,0.3)]",
          "hover:bg-white/[0.11] hover:border-white/[0.2] hover:text-white",
          "focus-visible:ring-white/40",
          "backdrop-blur-sm",
        ],

        /* ── Outline / Ghost ── */
        outline: [
          "bg-transparent",
          "border-white/[0.18]",
          "text-slate-300",
          "shadow-none",
          "hover:bg-white/[0.06] hover:border-amber-400/45 hover:text-amber-300",
          "hover:shadow-[0_0_12px_rgba(245,166,35,0.15)]",
          "focus-visible:ring-amber-400/50",
        ],

        /* ── Ghost minimal ── */
        ghost: [
          "bg-transparent border-transparent",
          "text-slate-400",
          "hover:bg-white/[0.06] hover:text-slate-200",
          "focus-visible:ring-white/30",
        ],

        /* ── Premium — luxury gold ── */
        premium: [
          "bg-[linear-gradient(135deg,#fef08a_0%,#fde047_20%,#f5a623_55%,#fde047_80%,#fef08a_100%)]",
          "bg-[length:200%_100%] hover:bg-right",
          "border-yellow-200/40",
          "text-yellow-950 font-black tracking-widest",
          "shadow-[0_4px_24px_rgba(253,224,71,0.45),0_1px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]",
          "hover:shadow-[0_6px_32px_rgba(253,224,71,0.65)]",
          "focus-visible:ring-yellow-300",
        ],
      },

      /* ── SIZE ── */
      size: {
        xs:  "h-7  px-2.5 text-[0.65rem] rounded-lg  gap-1",
        sm:  "h-8  px-3   text-[0.72rem] rounded-lg  gap-1.5",
        md:  "h-10 px-4   text-sm        rounded-xl  gap-2",
        lg:  "h-11 px-6   text-sm        rounded-xl  gap-2",
        xl:  "h-13 px-8   text-base      rounded-2xl gap-2.5",
        icon:"h-10 w-10   rounded-xl     p-0         gap-0",
      },

      /* ── FULL WIDTH ── */
      fullWidth: {
        true:  "w-full",
        false: "w-auto",
      },

      /* ── LOADING STATE (slot for spinner icon) ── */
      loading: {
        true:  "cursor-wait pointer-events-none opacity-75",
        false: "",
      },
    },

    defaultVariants: {
      variant:   "default",
      size:      "md",
      fullWidth: false,
      loading:   false,
    },
  }
);

/* ═══════════════════════════════════════════════════════════
   LOADING SPINNER
═══════════════════════════════════════════════════════════ */

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROPS
═══════════════════════════════════════════════════════════ */

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?:   boolean;
  loading?:   boolean;
  /** Icon rendered before label (hidden during loading) */
  icon?:      React.ReactNode;
  /** Icon rendered after label */
  iconRight?: React.ReactNode;
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      asChild = false,
      icon,
      iconRight,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    /* Spinner size mirrors button size */
    const spinnerSize: Record<string, string> = {
      xs: "h-3 w-3",
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-4 w-4",
      xl: "h-5 w-5",
      icon:"h-4 w-4",
    };
    const resolvedSize  = (size ?? "md") as string;
    const spinClass     = spinnerSize[resolvedSize] ?? "h-4 w-4";

    return (
      <Comp
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          buttonVariants({ variant, size, fullWidth, loading: loading ?? false }),
          className
        )}
        {...props}
      >
        {/* Left icon — replaced by spinner when loading */}
        {loading ? (
          <Spinner className={spinClass} />
        ) : icon ? (
          <span className="inline-flex shrink-0 items-center [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </span>
        ) : null}

        {/* Label */}
        {children && (
          <span className={cn(loading && "opacity-80")}>
            {children}
          </span>
        )}

        {/* Right icon (hidden when loading) */}
        {!loading && iconRight && (
          <span className="inline-flex shrink-0 items-center [&>svg]:h-4 [&>svg]:w-4">
            {iconRight}
          </span>
        )}

        {/* Inner top-highlight for convex feel */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-full bg-white/20"
        />
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };

/* ═══════════════════════════════════════════════════════════
   CONVENIENCE WRAPPERS
═══════════════════════════════════════════════════════════ */

/** Icon-only button with square aspect ratio */
export function IconButton({
  children,
  "aria-label": ariaLabel,
  ...props
}: ButtonProps & { "aria-label": string }) {
  return (
    <Button size="icon" aria-label={ariaLabel} {...props}>
      <span className="inline-flex items-center [&>svg]:h-[1.1em] [&>svg]:w-[1.1em]">
        {children}
      </span>
    </Button>
  );
}

/** Full-width CTA block button */
export function BlockButton(props: ButtonProps) {
  return <Button fullWidth {...props} />;
}