import { useState, useCallback, useRef, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Zap, ListChecks, Users, Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useThrottle } from "@/hooks/usePerformance";
import { DailyRewardsSpinner } from "@/components/DailyRewardsSpinner";
import {
  PremiumCard, GlowingBadge,
} from "@/components/EnhancedUIComponents";
import { generateDailyRewards } from "@/lib/dailyRewards";

/* ═══════════════════════════════════════════════════════════════════
   OPTIMIZED APP.TSX - HAMSTER BOT INSPIRED
═══════════════════════════════════════════════════════════════════ */

type ActiveTab = "home" | "upgrades" | "tasks" | "friends" | "leaderboard" | "settings";

interface UserStats {
  points: number;
  level: number;
  energy: number;
  maxEnergy: number;
  pph: number;
  combo: number;
  lastTapTime: number;
}

const initialStats: UserStats = {
  points: 125480,
  level: 42,
  energy: 100,
  maxEnergy: 100,
  pph: 1240,
  combo: 0,
  lastTapTime: 0,
};

/* ═══════════════════════════════════════════════════════════════════
   TAP HANDLER - OPTIMIZED FOR SPEED
═══════════════════════════════════════════════════════════════════ */
const TapButton = memo(function TapButton({
  onTap,
  energy,
  maxEnergy,
  isDisabled,
}: {
  onTap: () => void;
  energy: number;
  maxEnergy: number;
  isDisabled: boolean;
}) {
  const [scale, setScale] = useState(1);

  return (
    <motion.button
      onMouseDown={() => !isDisabled && setScale(0.92)}
      onMouseUp={() => setScale(1)}
      onMouseLeave={() => setScale(1)}
      onClick={onTap}
      disabled={isDisabled}
      animate={{ scale }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="relative w-40 h-40 mx-auto mb-8 focus:outline-none"
    >
      {/* Hamster Circle Background */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 shadow-2xl" />

      {/* Shine Effect */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/40 to-transparent" />

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-6xl select-none">🐹</span>
        <p className="text-sm font-bold mt-1">TAP</p>
      </div>

      {/* Energy Ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-4 border-emerald-400"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ opacity: Math.min(energy / maxEnergy, 1) }}
      />

      {/* Disabled Overlay */}
      {isDisabled && (
        <div className="absolute inset-0 rounded-full bg-gray-900/50 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
      )}
    </motion.button>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   QUICK STATS - HAMSTER BOT STYLE
═══════════════════════════════════════════════════════════════════ */
const QuickStats = memo(function QuickStats({ stats }: { stats: UserStats }) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-6">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-3 text-center">
        <p className="text-xs text-slate-400">Level</p>
        <p className="text-lg font-bold text-white">{stats.level}</p>
      </div>
      <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 rounded-lg p-3 text-center">
        <p className="text-xs text-cyan-300">PPH</p>
        <p className="text-lg font-bold text-cyan-400">{stats.pph}</p>
      </div>
      <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 rounded-lg p-3 text-center">
        <p className="text-xs text-emerald-300">Energy</p>
        <p className="text-lg font-bold text-emerald-400">{stats.energy}%</p>
      </div>
      <div className="bg-gradient-to-br from-amber-900/50 to-amber-800/30 rounded-lg p-3 text-center">
        <p className="text-xs text-amber-300">Combo</p>
        <p className="text-lg font-bold text-amber-400">×{stats.combo}</p>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   NAVIGATION - BOTTOM TABBAR
═══════════════════════════════════════════════════════════════════ */
const BottomNav = memo(function BottomNav({
  active,
  onChange,
}: {
  active: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}) {
  const navItems: Array<{ id: ActiveTab; label: string; icon: any }> = [
    { id: "home", label: "Home", icon: Home },
    { id: "upgrades", label: "Upgrades", icon: Zap },
    { id: "tasks", label: "Tasks", icon: ListChecks },
    { id: "friends", label: "Friends", icon: Users },
    { id: "leaderboard", label: "Ranking", icon: Trophy },
  ];

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-slate-800/80 border-t border-slate-700 backdrop-blur-md"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              onClick={() => onChange(item.id)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all"
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.2 : 1,
                  color: isActive ? "#fbbf24" : "#94a3b8",
                }}
              >
                <Icon size={20} />
              </motion.div>
              <span
                className={`text-xs font-medium ${
                  isActive ? "text-amber-400" : "text-slate-400"
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  className="h-1 w-6 bg-amber-400 rounded-full"
                  layoutId="activeTab"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   SCREEN COMPONENTS
═══════════════════════════════════════════════════════════════════ */
const HomeScreen = memo(function HomeScreen({
  stats,
  onTap,
  onShowDaily,
}: {
  stats: UserStats;
  onTap: () => void;
  onShowDaily: () => void;
}) {
  const { i18n } = useTranslation();
  const isRTL = ["ar", "fa"].includes(i18n.language);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`min-h-screen pb-28 pt-6 px-4 ${isRTL ? "rtl" : "ltr"}`}
    >
      {/* Header with Points Display */}
      <div className="text-center mb-8">
        <motion.div
          className="inline-block"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <p className="text-sm text-slate-400 mb-2">Your Points</p>
          <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
            {stats.points.toLocaleString()}
          </p>
        </motion.div>
      </div>

      {/* Quick Stats */}
      <QuickStats stats={stats} />

      {/* Tap Button */}
      <TapButton
        onTap={onTap}
        energy={stats.energy}
        maxEnergy={stats.maxEnergy}
        isDisabled={stats.energy < 10}
      />

      {/* Daily Rewards Button */}
      <motion.button
        onClick={onShowDaily}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold flex items-center justify-center gap-2 mb-4"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>🎁</span>
        Daily Rewards
        <span>→</span>
      </motion.button>

      {/* Quick Links */}
      <div className="space-y-3">
        <PremiumCard variant="gold">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Next Level</p>
                <p className="text-2xl font-bold text-white">Level {stats.level + 1}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400/30 to-orange-500/30 flex items-center justify-center">
                <span className="text-3xl">⭐</span>
              </div>
            </div>
          </div>
        </PremiumCard>
      </div>
    </motion.div>
  );
});

const UpgradesScreen = memo(function UpgradesScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pb-28 pt-6 px-4"
    >
      <h1 className="text-3xl font-bold text-white mb-6">⚡ Upgrades</h1>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <PremiumCard key={i} variant={["gold", "cyan", "violet", "default", "gold"][i % 5] as any}>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Upgrade {i}</p>
                <p className="text-sm text-slate-400">Cost: 50,000 points</p>
              </div>
              <motion.button
                className="px-4 py-2 rounded-lg bg-amber-500 text-white font-bold text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Buy
              </motion.button>
            </div>
          </PremiumCard>
        ))}
      </div>
    </motion.div>
  );
});

const TasksScreen = memo(function TasksScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pb-28 pt-6 px-4"
    >
      <h1 className="text-3xl font-bold text-white mb-6">📋 Tasks</h1>
      <div className="space-y-3">
        {[
          { title: "Follow on Twitter", reward: 1000, icon: "🐦" },
          { title: "Join Discord", reward: 1500, icon: "💜" },
          { title: "Visit Website", reward: 500, icon: "🌐" },
        ].map((task, i) => (
          <PremiumCard key={i} variant="cyan">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{task.icon}</span>
                <div>
                  <p className="font-bold text-white">{task.title}</p>
                  <p className="text-sm text-cyan-300">+{task.reward} points</p>
                </div>
              </div>
              <motion.button
                className="px-3 py-1 rounded-lg bg-cyan-500 text-white font-bold text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Do
              </motion.button>
            </div>
          </PremiumCard>
        ))}
      </div>
    </motion.div>
  );
});

const FriendsScreen = memo(function FriendsScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pb-28 pt-6 px-4"
    >
      <h1 className="text-3xl font-bold text-white mb-6">👥 Friends</h1>
      <GlowingBadge color="emerald">
        <span className="text-center block">🔗 Referral Link Copied</span>
      </GlowingBadge>
      <div className="space-y-2">
        {["Ali", "Sara", "Ahmed", "Fatima"].map((name, i) => (
          <motion.div
            key={i}
            className="p-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <span className="text-lg">👤</span>
              </div>
              <div>
                <p className="font-bold text-white">{name}</p>
                <p className="text-xs text-slate-400">+250 points</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

const LeaderboardScreen = memo(function LeaderboardScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pb-28 pt-6 px-4"
    >
      <h1 className="text-3xl font-bold text-white mb-6">🏆 Leaderboard</h1>
      <div className="space-y-2">
        {[
          { rank: 1, name: "You", points: 2500000, icon: "👑" },
          { rank: 2, name: "Ahmed", points: 2480000, icon: "🥈" },
          { rank: 3, name: "Sara", points: 2450000, icon: "🥉" },
          { rank: 4, name: "Ali", points: 2410000, icon: "4️⃣" },
          { rank: 5, name: "Fatima", points: 2350000, icon: "5️⃣" },
        ].map((item) => (
          <motion.div
            key={item.rank}
            className={`p-4 rounded-xl flex items-center justify-between ${
              item.rank === 1
                ? "bg-gradient-to-r from-amber-600 to-orange-600"
                : "bg-gradient-to-r from-slate-800 to-slate-900"
            }`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-bold text-white">{item.name}</p>
                <p className="text-sm text-slate-400">{item.points.toLocaleString()}</p>
              </div>
            </div>
            <span className="text-sm font-bold text-slate-300">#{item.rank}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   MAIN APP COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [stats, setStats] = useState<UserStats>(initialStats);
  const [showDaily, setShowDaily] = useState(false);
  const [rewards] = useState(() => generateDailyRewards());
  const tapCountRef = useRef(0);
  const energyRechargeRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  /* Fast tap handler with throttle */
  const handleTap = useThrottle(() => {
    if (stats.energy < 10) {
      toast.error("No energy!");
      return;
    }

    tapCountRef.current += 1;
    const tapValue = 10;
    const newCombo = Math.min(stats.combo + 1, 100);

    setStats((prev) => ({
      ...prev,
      points: prev.points + tapValue,
      energy: Math.max(prev.energy - 5, 0),
      combo: newCombo,
      lastTapTime: Date.now(),
    }));
  }, 80); // Ultra-fast 80ms throttle

  /* Energy recharge */
  useEffect(() => {
    if (stats.energy >= stats.maxEnergy) return;

    energyRechargeRef.current = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        energy: Math.min(prev.energy + 1, prev.maxEnergy),
      }));
    }, 3000);

    return () => clearInterval(energyRechargeRef.current);
  }, [stats.energy, stats.maxEnergy]);

  const handleShowDaily = useCallback(() => {
    setShowDaily(true);
  }, []);

  const handleClaimDaily = useCallback((day: number) => {
    const reward = rewards[day - 1];
    if (reward) {
      const amount = Math.floor(reward.baseReward * reward.multiplier);
      setStats((prev) => ({
        ...prev,
        points: prev.points + amount,
      }));
      toast.success(`+${amount} points! 🎉`);
    }
  }, [rewards]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <AnimatePresence mode="wait">
        {activeTab === "home" && (
          <HomeScreen
            key="home"
            stats={stats}
            onTap={handleTap}
            onShowDaily={handleShowDaily}
          />
        )}
        {activeTab === "upgrades" && <UpgradesScreen key="upgrades" />}
        {activeTab === "tasks" && <TasksScreen key="tasks" />}
        {activeTab === "friends" && <FriendsScreen key="friends" />}
        {activeTab === "leaderboard" && <LeaderboardScreen key="leaderboard" />}
      </AnimatePresence>

      <BottomNav active={activeTab} onChange={setActiveTab} />

      {/* Daily Rewards Spinner */}
      <DailyRewardsSpinner
        isOpen={showDaily}
        onClose={() => setShowDaily(false)}
        onClaim={handleClaimDaily}
        rewards={rewards}
        currentDay={1}
      />
    </div>
  );
}
