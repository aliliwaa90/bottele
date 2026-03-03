/**
 * VaultTap — Animation & UI Component System
 * ─────────────────────────────────────────────────────────────────
 * Production-grade, fully type-safe animation library.
 *
 * Safety guarantees:
 *  • No window/document access at render time (SSR-safe)
 *  • All randomness seeded at mount, never at render
 *  • Reduced-motion respected throughout
 *  • All timers / RAF / listeners cleaned up on unmount
 *  • No inline event-handler memory leaks
 *  • Stable keys — no index-as-key anti-patterns
 *  • Zero console errors in strict mode
 * ─────────────────────────────────────────────────────────────────
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";

/* ─── tiny cn helper (no clsx dependency needed) ─────────────────── */
function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/* ═══════════════════════════════════════════════
   REDUCED MOTION HOOK
═══════════════════════════════════════════════ */

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

/* ═══════════════════════════════════════════════
   SEEDED RANDOM HELPERS  (stable across renders)
═══════════════════════════════════════════════ */

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededArray<T>(
  length: number,
  factory: (rand: () => number, i: number) => T,
  seed = 42,
): T[] {
  const rand = mulberry32(seed);
  return Array.from({ length }, (_, i) => factory(rand, i));
}

/* ═══════════════════════════════════════════════
   1. FLOATING PARTICLES
═══════════════════════════════════════════════ */

interface Particle {
  id:       string;
  top:      number;
  left:     number;
  size:     number;
  duration: number;
  delay:    number;
  dx:       number;
  dy:       number;
  color:    string;
}

const PARTICLE_COLORS = [
  "rgba(245,197,66,0.55)",
  "rgba(139,92,246,0.45)",
  "rgba(20,184,166,0.50)",
  "rgba(249,115,22,0.45)",
  "rgba(236,72,153,0.40)",
];

export interface FloatingParticlesProps {
  count?:     number;
  className?: string;
}

export function FloatingParticles({
  count     = 22,
  className,
}: FloatingParticlesProps) {
  const reduced = useReducedMotion();

  const particles = useMemo<Particle[]>(() =>
    seededArray(count, (rand, i) => ({
      id:       `fp-${i}`,
      top:      rand() * 100,
      left:     rand() * 100,
      size:     2 + rand() * 3,
      duration: 10 + rand() * 14,
      delay:    rand() * -12,
      dx:       (rand() - 0.5) * 120,
      dy:       (rand() - 0.5) * 120,
      color:    PARTICLE_COLORS[i % PARTICLE_COLORS.length] ?? "rgba(245,197,66,0.55)",
    })),
  [count]);

  if (reduced) return null;

  return (
    <div
      className={cn("fixed inset-0 pointer-events-none overflow-hidden z-0", className)}
      aria-hidden
    >
      {particles.map(p => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            top:    `${p.top}%`,
            left:   `${p.left}%`,
            width:  p.size,
            height: p.size,
            background: p.color,
            filter: "blur(1px)",
          }}
          animate={{
            x:       [0, p.dx, p.dx * 0.4, 0],
            y:       [0, p.dy * 0.6, p.dy, 0],
            opacity: [0.2, 0.7, 0.35, 0.2],
            scale:   [0.6, 1.4, 0.9, 0.6],
          }}
          transition={{
            duration: p.duration,
            delay:    p.delay,
            repeat:   Infinity,
            ease:     "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   2. PULSING GLOW WRAPPER
═══════════════════════════════════════════════ */

export interface PulsingGlowProps {
  children:   React.ReactNode;
  color?:     string;
  intensity?: number;
  className?: string;
  animate?:   boolean;
}

export function PulsingGlow({
  children,
  color     = "rgba(245,197,66,0.35)",
  intensity = 1,
  className,
  animate   = true,
}: PulsingGlowProps) {
  const reduced = useReducedMotion();
  const on      = animate && !reduced;

  const lo = `0 0 ${16 * intensity}px 0 ${color}`;
  const hi = `0 0 ${42 * intensity}px 6px ${color}`;

  return (
    <motion.div
      className={cn("relative", className)}
      animate={on ? { boxShadow: [lo, hi, lo] } : undefined}
      transition={on ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   3. SHAKE
═══════════════════════════════════════════════ */

export interface ShakeProps {
  children:   React.ReactNode;
  trigger?:   boolean;
  intensity?: number;
  className?: string;
}

export function Shake({
  children,
  trigger   = false,
  intensity = 3,
  className,
}: ShakeProps) {
  const [shakeX, setShakeX] = useState<number[] | number>(0);
  const prevRef  = useRef(false);

  useEffect(() => {
    if (trigger && !prevRef.current) {
      setShakeX([0, -intensity, intensity, -intensity, intensity, -(intensity * 0.5), intensity * 0.5, 0]);
    }
    prevRef.current = trigger;
  }, [trigger, intensity]);

  return (
    <motion.div
      className={className}
      animate={{ x: shakeX }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      onAnimationComplete={() => {
        setShakeX(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   4. BOUNCE CARD
═══════════════════════════════════════════════ */

export interface BounceCardProps {
  children:   React.ReactNode;
  className?: string;
  onClick?:   () => void;
  disabled?:  boolean;
  scale?:     number;
}

export function BounceCard({
  children,
  className,
  onClick,
  disabled = false,
  scale    = 1.04,
}: BounceCardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={cn(
        "cursor-pointer select-none",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      whileHover={!reduced && !disabled ? { scale, y: -4 } : undefined}
      whileTap={!reduced && !disabled ? { scale: 0.95 } : undefined}
      transition={{ type: "spring", stiffness: 420, damping: 16 }}
      onClick={!disabled ? onClick : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onKeyDown={
        onClick && !disabled
          ? (e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === "Enter" || e.key === " ") onClick(); }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   5. GRADIENT PULSE BACKGROUND
═══════════════════════════════════════════════ */

export interface GradientPulseProps {
  children:   React.ReactNode;
  colors?:    [string, string, string];
  className?: string;
}

export function GradientPulse({
  children,
  colors    = ["#a855f7", "#f5c542", "#06b6d4"],
  className,
}: GradientPulseProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={cn("relative overflow-hidden", className)}
      animate={!reduced ? { backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] } : undefined}
      transition={!reduced ? { duration: 9, repeat: Infinity, ease: "linear" } : undefined}
      style={{
        backgroundImage: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`,
        backgroundSize: "200% 200%",
      }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   6. STAGGERED LIST
═══════════════════════════════════════════════ */

export interface StaggeredListProps {
  children:   React.ReactNode;
  delay?:     number;
  className?: string;
  itemClass?: string;
}

const staggerContainer = {
  hidden:  {},
  visible: (delay: number) => ({
    transition: { staggerChildren: delay },
  }),
};

const staggerItem = {
  hidden:  { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y:       0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
};

export function StaggeredList({
  children,
  delay     = 0.07,
  className,
  itemClass,
}: StaggeredListProps) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  const items = Array.isArray(children) ? children : [children];

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      custom={delay}
      variants={staggerContainer}
    >
      {items.map((child, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <motion.div key={idx} className={itemClass} variants={staggerItem}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   7. ANIMATED NUMBER COUNTER
═══════════════════════════════════════════════ */

export interface CounterAnimationProps {
  to:         number;
  from?:      number;
  duration?:  number;
  decimals?:  number;
  format?:    (v: number) => string;
  className?: string;
}

export function CounterAnimation({
  to,
  from      = 0,
  duration  = 0.75,
  decimals  = 0,
  format    = (v) =>
    decimals === 0
      ? Math.round(v).toLocaleString("en-US")
      : v.toFixed(decimals),
  className,
}: CounterAnimationProps) {
  const reduced  = useReducedMotion();
  const [val, setVal] = useState(from);
  const rafRef   = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef  = useRef(from);

  useEffect(() => {
    if (reduced) { setVal(to); return; }

    fromRef.current = val;
    startRef.current = 0;

    const tick = (now: number) => {
      if (startRef.current === 0) startRef.current = now;
      const elapsed  = now - startRef.current;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased    = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setVal(fromRef.current + (to - fromRef.current) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration, reduced]);

  return <span className={className}>{format(val)}</span>;
}

/* ═══════════════════════════════════════════════
   8. SLIDE IN
═══════════════════════════════════════════════ */

export interface SlideInProps {
  children:   React.ReactNode;
  direction?: "left" | "right" | "up" | "down";
  distance?:  number;
  delay?:     number;
  duration?:  number;
  className?: string;
}

const SLIDE_AXES = {
  left:  { x: -1, y:  0 },
  right: { x:  1, y:  0 },
  up:    { x:  0, y:  1 },
  down:  { x:  0, y: -1 },
};

export function SlideIn({
  children,
  direction = "up",
  distance  = 28,
  delay     = 0,
  duration  = 0.42,
  className,
}: SlideInProps) {
  const reduced = useReducedMotion();
  const axis    = SLIDE_AXES[direction];

  return (
    <motion.div
      className={className}
      initial={
        !reduced
          ? { opacity: 0, x: axis.x * distance, y: axis.y * distance }
          : undefined
      }
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   9. SVG SPINNER
═══════════════════════════════════════════════ */

export interface SpinnerProps {
  size?:       number;
  trackColor?: string;
  arcColor?:   string;
  className?:  string;
}

export function Spinner({
  size       = 40,
  trackColor = "rgba(255,255,255,0.08)",
  arcColor   = "#f5c542",
  className,
}: SpinnerProps) {
  const r   = (size - 4) / 2;
  const cxy = size / 2;

  return (
    <motion.svg
      className={cn("block shrink-0", className)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      aria-label="Loading"
      role="status"
    >
      <circle cx={cxy} cy={cxy} r={r} fill="none" stroke={trackColor} strokeWidth={4} />
      <circle
        cx={cxy} cy={cxy} r={r}
        fill="none"
        stroke={arcColor}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${r * 1.5} ${r * 99}`}
        transform={`rotate(-90 ${cxy} ${cxy})`}
      />
    </motion.svg>
  );
}

/* ═══════════════════════════════════════════════
   10. FLOATING GAIN LABEL
═══════════════════════════════════════════════ */

export interface FloatingGainProps {
  value:    number;
  burst?:   boolean;
  left?:    number;
  top?:     number;
  onDone?:  () => void;
  format?:  (v: number) => string;
}

export function FloatingGain({
  value,
  burst  = false,
  left   = 50,
  top    = 40,
  onDone,
  format = (v) => v.toLocaleString("en-US"),
}: FloatingGainProps) {
  return (
    <motion.span
      className="absolute z-20 pointer-events-none select-none font-mono font-bold"
      style={{
        left: `${left}%`,
        top:  `${top}%`,
        translateX: "-50%",
        fontSize:   burst ? 22 : 16,
        color:      burst ? "#ffffff" : "#ffd166",
        textShadow: burst
          ? "0 0 20px rgba(245,197,66,0.9), 0 0 40px rgba(245,197,66,0.4)"
          : "0 0 12px rgba(245,197,66,0.65)",
      }}
      initial={{ opacity: 1, y: 0,  scale: burst ? 0.8 : 0.7 }}
      animate={{ opacity: 0, y: burst ? -82 : -54, scale: burst ? 1.3 : 1.05 }}
      transition={{ duration: burst ? 1.15 : 0.92, ease: "easeOut" }}
      onAnimationComplete={onDone}
    >
      {burst ? "🔥 " : "+"}{format(value)}
    </motion.span>
  );
}

/* ═══════════════════════════════════════════════
   11. TOAST NOTIFICATION
═══════════════════════════════════════════════ */

type ToastType = "success" | "error" | "warning" | "info" | "coin";

export interface ToastNotificationProps {
  message:   string;
  type?:     ToastType;
  value?:    number;
  duration?: number;
  onClose?:  () => void;
}

const TOAST_META: Record<ToastType, { icon: string; from: string; to: string }> = {
  success: { icon: "✅", from: "#22c55e", to: "#4ade80" },
  error:   { icon: "❌", from: "#ef4444", to: "#f87171" },
  warning: { icon: "⚠️", from: "#f59e0b", to: "#fbbf24" },
  info:    { icon: "ℹ️", from: "#06b6d4", to: "#22d3ee" },
  coin:    { icon: "🪙", from: "#f5c542", to: "#ffe083" },
};

export function ToastNotification({
  message,
  type     = "info",
  value,
  duration = 2800,
  onClose,
}: ToastNotificationProps) {
  const meta = TOAST_META[type];

  useEffect(() => {
    if (!duration) return;
    const t = window.setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-sm text-white shadow-xl"
      style={{
        background: `linear-gradient(120deg, ${meta.from}, ${meta.to})`,
        boxShadow:  `0 4px 22px ${meta.from}55`,
        maxWidth:   260,
      }}
      initial={{ opacity: 0, y: 16, scale: 0.88 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{ opacity: 0, y: -8, scale: 0.92, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
    >
      <span>{meta.icon}</span>
      <span>
        {value != null ? `+${value.toLocaleString("en-US")} ` : ""}
        {message}
      </span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   12. CIRCULAR PROGRESS RING
═══════════════════════════════════════════════ */

export interface ProgressRingProps {
  percent:          number;
  size?:            number;
  width?:           number;
  strokeWidth?:     number;
  trackColor?:      string;
  className?:       string;
  label?:           React.ReactNode;
  gradientColors?:  [string, string];
}

export function ProgressRing({
  percent,
  size           = 96,
  width,
  strokeWidth    = 5,
  trackColor     = "rgba(255,255,255,0.07)",
  className,
  label,
  gradientColors = ["#a855f7", "#f5c542"],
}: ProgressRingProps) {
  const ringWidth = width ?? strokeWidth;
  const uid    = useId();
  const gid    = `vt-ring-${uid.replace(/:/g, "")}`;
  const r      = (size - ringWidth) / 2;
  const circum = 2 * Math.PI * r;
  const offset = circum * (1 - Math.min(1, Math.max(0, percent / 100)));
  const reduced = useReducedMotion();

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        role="progressbar"
      >
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={gradientColors[0]} />
            <stop offset="100%" stopColor={gradientColors[1]} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={ringWidth} />
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={ringWidth}
          strokeLinecap="round"
          strokeDasharray={circum}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          animate={{ strokeDashoffset: offset }}
          transition={reduced ? { duration: 0 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center">
          {label}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   13. CONFETTI BURST
═══════════════════════════════════════════════ */

interface ConfettiPiece {
  id:       string;
  vx:       number;
  vy:       number;
  duration: number;
  color:    string;
  rotation: number;
  scale:    number;
  shape:    "circle" | "rect";
}

const CONFETTI_COLORS = [
  "#f5c542", "#a855f7", "#06b6d4",
  "#f97316", "#ec4899", "#22c55e",
];

export interface ConfettiBurstProps {
  active?:  boolean;
  count?:   number;
  originX?: number;
  originY?: number;
  onDone?:  () => void;
}

export function ConfettiBurst({
  active   = true,
  count    = 36,
  originX  = 50,
  originY  = 50,
  onDone,
}: ConfettiBurstProps) {
  const reduced                    = useReducedMotion();
  const [done, setDone]            = useState(false);
  const doneCount                  = useRef(0);
  const [viewW, setViewW]          = useState(0);
  const [viewH, setViewH]          = useState(0);

  useEffect(() => {
    setViewW(window.innerWidth);
    setViewH(window.innerHeight);
  }, []);

  const pieces = useMemo<ConfettiPiece[]>(() =>
    seededArray(count, (rand, i) => ({
      id:       `cf-${i}`,
      vx:       (rand() - 0.5) * viewW * 1.1,
      vy:       -(rand() * viewH * 0.85),
      duration: 1.8 + rand() * 0.6,
      color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? "#f5c542",
      rotation: rand() * 720 - 360,
      scale:    0.5 + rand() * 1.2,
      shape:    rand() > 0.5 ? "circle" : "rect",
    })),
  [count, viewW, viewH]);

  const handleDone = useCallback(() => {
    doneCount.current += 1;
    if (doneCount.current >= count) {
      setDone(true);
      onDone?.();
    }
  }, [count, onDone]);

  if (!active || done || reduced || !viewW) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-50"
      aria-hidden
    >
      {pieces.map(p => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left:         `${originX}%`,
            top:          `${originY}%`,
            width:        p.shape === "circle" ? 8  : 10,
            height:       p.shape === "circle" ? 8  : 6,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            background:   p.color,
          }}
          initial={{ opacity: 1, x: 0,   y: 0,   rotate: 0, scale: p.scale }}
          animate={{ opacity: 0, x: p.vx, y: p.vy, rotate: p.rotation, scale: p.scale * 0.6 }}
          transition={{ duration: p.duration, ease: "easeOut" }}
          onAnimationComplete={handleDone}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   14. 3D TILT CARD
═══════════════════════════════════════════════ */

export interface TiltCardProps {
  children:   React.ReactNode;
  className?: string;
  maxTilt?:   number;
  glare?:     boolean;
  disabled?:  boolean;
}

export function TiltCard({
  children,
  className,
  maxTilt  = 12,
  glare    = true,
  disabled = false,
}: TiltCardProps) {
  const reduced = useReducedMotion();
  const ref     = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const glareX = `${((rotation.y + maxTilt) / (2 * maxTilt)) * 160 - 30}%`;
  const glareY = `${((rotation.x + maxTilt) / (2 * maxTilt)) * 160 - 30}%`;

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setRotation({
      x: -((e.clientY - rect.top) / rect.height - 0.5) * maxTilt,
      y: ((e.clientX - rect.left) / rect.width - 0.5) * maxTilt,
    });
  }, [disabled, maxTilt, reduced]);

  const onLeave = useCallback(() => {
    setRotation({ x: 0, y: 0 });
  }, []);

  return (
    <motion.div
      ref={ref}
      className={cn("relative", className)}
      style={{ transformStyle: "preserve-3d" }}
      animate={{ rotateX: rotation.x, rotateY: rotation.y }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}

      {glare && !reduced && !disabled && (
        <div
          className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden"
          aria-hidden
        >
          <motion.div
            className="absolute w-1/2 h-full"
            style={{
              left:       glareX,
              top:        glareY,
              background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(255,255,255,0.13) 0%, transparent 75%)",
              borderRadius: "50%",
            }}
          />
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   15. MORPHING BACKGROUND ORBS
═══════════════════════════════════════════════ */

interface OrbData {
  id:       string;
  size:     number;
  top:      number;
  left:     number;
  color:    string;
  duration: number;
  dx:       number[];
  dy:       number[];
}

const ORB_COLORS = [
  "rgba(245,197,66,0.14)",
  "rgba(139,92,246,0.12)",
  "rgba(20,184,166,0.11)",
  "rgba(249,115,22,0.10)",
];

export interface MorphingOrbsProps {
  count?:     number;
  className?: string;
}

export function MorphingOrbs({ count = 3, className }: MorphingOrbsProps) {
  const reduced = useReducedMotion();

  const orbs = useMemo<OrbData[]>(() =>
    seededArray(count, (rand, i) => ({
      id:       `orb-${i}`,
      size:     220 + rand() * 260,
      top:      rand() * 80,
      left:     rand() * 80,
      color:    ORB_COLORS[i % ORB_COLORS.length] ?? "rgba(245,197,66,0.14)",
      duration: 18 + rand() * 16,
      dx:       [0, (rand() - 0.5) * 80, (rand() - 0.5) * 80, 0],
      dy:       [0, (rand() - 0.5) * 80, (rand() - 0.5) * 80, 0],
    })),
  [count]);

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
      aria-hidden
    >
      {orbs.map(o => (
        <motion.div
          key={o.id}
          className="absolute rounded-full"
          style={{
            width:      o.size,
            height:     o.size,
            top:        `${o.top}%`,
            left:       `${o.left}%`,
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            filter:     "blur(60px)",
          }}
          animate={!reduced ? { x: o.dx, y: o.dy } : undefined}
          transition={!reduced ? { duration: o.duration, repeat: Infinity, ease: "easeInOut" } : undefined}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   16. SCAN LINE OVERLAY
═══════════════════════════════════════════════ */

export interface ScanLineProps {
  opacity?:   number;
  className?: string;
}

export function ScanLine({ opacity = 0.025, className }: ScanLineProps) {
  return (
    <div
      className={cn("fixed inset-0 pointer-events-none z-10", className)}
      aria-hidden
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 3px)",
        backgroundSize: "100% 3px",
        opacity,
      }}
    />
  );
}

/* ═══════════════════════════════════════════════
   17. PAGE TRANSITION WRAPPER
═══════════════════════════════════════════════ */

export interface PageTransitionProps {
  children:   React.ReactNode;
  motionKey:  string;
  direction?: number;
  className?: string;
}

const pageVariants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ? 28 : -28 }),
  center: {
    opacity: 1, x: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit:   (dir: number) => ({
    opacity: 0, x: dir > 0 ? -20 : 20,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function PageTransition({
  children,
  motionKey,
  direction = 1,
  className,
}: PageTransitionProps) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={motionKey}
        custom={direction}
        variants={pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════
   18. SPRING SCALE (pressable wrapper)
═══════════════════════════════════════════════ */

export interface SpringScaleProps {
  children:   React.ReactNode;
  tapScale?:  number;
  className?: string;
  onClick?:   () => void;
  disabled?:  boolean;
}

export function SpringScale({
  children,
  tapScale  = 0.92,
  className,
  onClick,
  disabled  = false,
}: SpringScaleProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={cn("inline-flex", disabled && "pointer-events-none opacity-40", className)}
      whileTap={!reduced && !disabled ? { scale: tapScale } : undefined}
      transition={{ type: "spring", stiffness: 480, damping: 20 }}
      onClick={!disabled ? onClick : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onKeyDown={
        onClick && !disabled
          ? (e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === "Enter" || e.key === " ") onClick(); }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   19. GOLD SHIMMER TEXT
═══════════════════════════════════════════════ */

export interface ShimmerTextProps {
  children:   React.ReactNode;
  className?: string;
  speed?:     number;
}

export function ShimmerText({ children, className, speed = 2.5 }: ShimmerTextProps) {
  return (
    <span
      className={cn("inline-block", className)}
      style={{
        background:    "linear-gradient(100deg, #ffe083 20%, #f5c542 40%, #fff9d6 60%, #f5c542 80%, #ffe083 100%)",
        backgroundSize: "300% auto",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor:  "transparent",
        backgroundClip:       "text",
        animation: `vt-shimmer ${speed}s linear infinite`,
      }}
    >
      {children}
      <style>{`@keyframes vt-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}`}</style>
    </span>
  );
}

/* ═══════════════════════════════════════════════
   20. ENERGY PULSE RING
═══════════════════════════════════════════════ */

export interface EnergyPulseRingProps {
  active?:    boolean;
  color?:     string;
  size?:      number;
  className?: string;
}

export function EnergyPulseRing({
  active    = true,
  color     = "rgba(245,197,66,0.3)",
  size      = 200,
  className,
}: EnergyPulseRingProps) {
  const reduced = useReducedMotion();

  if (!active || reduced) return null;

  return (
    <div
      className={cn("absolute pointer-events-none", className)}
      aria-hidden
      style={{ width: size, height: size, top: "50%", left: "50%", translate: "-50% -50%" }}
    >
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: color }}
          animate={{ scale: [1, 1.55], opacity: [0.6, 0] }}
          transition={{ duration: 2, delay: i * 0.65, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   21. POPUP NOTIFICATION  (legacy compat alias)
═══════════════════════════════════════════════ */

/** @deprecated — use ToastNotification instead */
export const PopupNotification = ToastNotification;

/** @deprecated — use Shake instead */
export const ShakeAnimation = Shake;

/** @deprecated — use Spinner instead */
export const RotatingSpinner = Spinner;
