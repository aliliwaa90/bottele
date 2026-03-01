/**
 * VaultTap - Premium Animation & UI Enhancements
 * Beautiful animations and modern UI components
 */

import { motion } from "framer-motion";
import React from "react";

// ============ FLOATING PARTICLES ============
export const FloatingParticles: React.FC<{ count?: number }> = ({ count = 20 }) => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-sm opacity-60"
          animate={{
            x: Math.sin(i) * 100,
            y: Math.cos(i) * 100,
            opacity: [0.2, 0.6, 0.2],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 8 + i,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            top: `${(i / count) * 100}%`,
            left: `${(i % 10) * 10}%`,
          }}
        />
      ))}
    </div>
  );
};

// ============ PULSING GLOW ============
export const PulsingGlow: React.FC<{
  children: React.ReactNode;
  color?: string;
  intensity?: number;
}> = ({ children, color: _color = "purple", intensity = 1 }) => {
  return (
    <motion.div
      className="relative"
      animate={{
        boxShadow: [
          `0 0 ${20 * intensity}px 0 rgba(168, 85, 247, 0.3)`,
          `0 0 ${40 * intensity}px 0 rgba(168, 85, 247, 0.6)`,
          `0 0 ${20 * intensity}px 0 rgba(168, 85, 247, 0.3)`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
};

// ============ SHAKE ANIMATION ============
export const ShakeAnimation: React.FC<{ children: React.ReactNode; trigger?: boolean }> = ({
  children,
  trigger = true,
}) => {
  return (
    <motion.div
      animate={trigger ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

// ============ BOUNCE CARD ============
export const BounceCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = "", onClick }) => {
  return (
    <motion.div
      className={`cursor-pointer ${className}`}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

// ============ GRADIENT PULSE ============
export const GradientPulse: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      animate={{
        backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "linear",
      }}
      style={{
        backgroundImage: "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)",
        backgroundSize: "200% 200%",
      }}
      className="relative"
    >
      {children}
    </motion.div>
  );
};

// ============ STAGGERED LIST ============
export const StaggeredList: React.FC<{
  children: React.ReactNode[];
  delay?: number;
  className?: string;
}> = ({ children, delay = 0.1, className = "" }) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: delay,
          },
        },
      }}
    >
      {React.Children.map(children, (child, idx) => (
        <motion.div
          key={idx}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.3 }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// ============ SMOOTH NUMBER COUNTER ============
export const CounterAnimation: React.FC<{
  from: number;
  to: number;
  duration?: number;
  format?: (value: number) => string;
}> = ({ from, to, duration = 0.6, format = (v) => Math.round(v).toLocaleString() }) => {
  const [value, setValue] = React.useState(from);

  React.useEffect(() => {
    const startTime = Date.now();
    const startValue = value;
    const difference = to - startValue;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      setValue(Math.floor(startValue + difference * progress));

      if (progress === 1) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [to, duration, value]);

  return <span>{format(value)}</span>;
};

// ============ SLIDE IN ============
export const SlideIn: React.FC<{
  children: React.ReactNode;
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
}> = ({ children, direction = "up", delay = 0 }) => {
  const variants = {
    left: { initial: { opacity: 0, x: -50 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: 50 }, animate: { opacity: 1, x: 0 } },
    up: { initial: { opacity: 0, y: 50 }, animate: { opacity: 1, y: 0 } },
    down: { initial: { opacity: 0, y: -50 }, animate: { opacity: 1, y: 0 } },
  };

  return (
    <motion.div
      initial={variants[direction].initial}
      animate={variants[direction].animate}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
};

// ============ ROTATING SPINNER ============
export const RotatingSpinner: React.FC<{ size?: number; color?: string }> = ({
  size = 40,
  color = "purple",
}) => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className={`border-4 border-${color}-200 border-t-${color}-600 rounded-full`}
      style={{ width: size, height: size }}
    />
  );
};

// ============ POPUP NOTIFICATION ============
export const PopupNotification: React.FC<{
  message: string;
  type?: "success" | "error" | "info";
  value?: number;
}> = ({ message, type = "info", value }) => {
  const colors = {
    success: "from-green-400 to-emerald-500",
    error: "from-red-400 to-pink-500",
    info: "from-blue-400 to-cyan-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.8 }}
      animate={{ opacity: 1, y: -20, scale: 1 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.4 }}
      className={`bg-gradient-to-r ${colors[type]} text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg`}
    >
      {value ? `+${value} ${message}` : message}
    </motion.div>
  );
};

// ============ PROGRESS RING ============
export const ProgressRing: React.FC<{
  percent: number;
  size?: number;
  width?: number;
  color?: string;
}> = ({ percent, size = 100, width = 4, color = "purple" }) => {
  const radius = (size - width) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <motion.svg
      width={size}
      height={size}
      className="transform -rotate-90"
      animate={{ rotate: -90 }}
    >
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={width} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#gradient-${color})`}
        strokeWidth={width}
        strokeDasharray={circumference}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.5 }}
      />
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
};

// ============ CONFETTI BURST ============
export const ConfettiBurst: React.FC<{ trigger?: boolean }> = ({ trigger = true }) => {
  if (!trigger) return null;

  return (
    <>
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="fixed pointer-events-none"
          initial={{
            opacity: 1,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          }}
          animate={{
            opacity: 0,
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 400,
            y: window.innerHeight / 2 + Math.random() * 400,
          }}
          transition={{
            duration: 2,
            ease: "easeOut",
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: ["#ff6b6b", "#ffd93d", "#6bcf7f", "#4d96ff", "#ff6b9d"][i % 5],
            }}
          />
        </motion.div>
      ))}
    </>
  );
};

// ============ TILT CARD ============
export const TiltCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => {
  const [rotateX, setRotateX] = React.useState(0);
  const [rotateY, setRotateY] = React.useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setRotateX((y - rect.height / 2) / 10);
    setRotateY((rect.width / 2 - x) / 10);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      className={`${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX, rotateY }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </motion.div>
  );
};
