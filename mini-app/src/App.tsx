import { useState, useCallback, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useThrottle } from "@/hooks/usePerformance";
import { DailyRewardsSpinner } from "@/components/DailyRewardsSpinner";
import { GlowingBadge } from "@/components/EnhancedUIComponents";
import { generateDailyRewards } from "@/lib/dailyRewards";

import "./styles/app-premium.css";

/* ═══════════════════════════════════════════════════════════════════
   PREMIUM APP - FULL FEATURED WITH BEAUTIFUL DESIGN
═══════════════════════════════════════════════════════════════════ */

type ActiveTab = "home" | "upgrades" | "tasks" | "friends" | "leaderboard" | "settings";

interface UserStats {
  points: string;
  level: number;
  energy: number;
  maxEnergy: number;
  pph: number;
  combo: number;
  stars: number;
  walletConnected: boolean;
  walletAddress: string;
}

interface Upgrade {
  id: string;
  name: string;
  description: string;
  price: number;
  priceType: "points" | "stars";
  level: number;
  maxLevel: number;
  boost: number;
  icon: string;
  category: "tap" | "energy" | "autotap";
}

const initialStats: UserStats = {
  points: "125480",
  level: 42,
  energy: 100,
  maxEnergy: 100,
  pph: 1240,
  combo: 0,
  stars: 50,
  walletConnected: false,
  walletAddress: "",
};

const UPGRADES: Upgrade[] = [
  {
    id: "tap-boost-1",
    name: "Iron Clicker",
    description: "Increase tap power by 20%",
    price: 500,
    priceType: "stars",
    level: 0,
    maxLevel: 10,
    boost: 1.2,
    icon: "⚒️",
    category: "tap",
  },
  {
    id: "tap-boost-2",
    name: "Golden Touch",
    description: "Increase tap power by 50%",
    price: 1000,
    priceType: "stars",
    level: 0,
    maxLevel: 5,
    boost: 1.5,
    icon: "✨",
    category: "tap",
  },
  {
    id: "energy-boost",
    name: "Energy Shield",
    description: "Max energy +50",
    price: 2000,
    priceType: "points",
    level: 0,
    maxLevel: 8,
    boost: 1.0,
    icon: "🛡️",
    category: "energy",
  },
  {
    id: "autotap-1",
    name: "Auto Clicker",
    description: "Earn +10 PPH",
    price: 5000,
    priceType: "points",
    level: 0,
    maxLevel: 20,
    boost: 1.0,
    icon: "🤖",
    category: "autotap",
  },
  {
    id: "autotap-2",
    name: "Turbo Clicker",
    description: "Earn +50 PPH",
    price: 3000,
    priceType: "stars",
    level: 0,
    maxLevel: 10,
    boost: 1.0,
    icon: "⚡",
    category: "autotap",
  },
];

/* ═══════════════════════════════════════════════════════════════════
   TAP BUTTON - BEAUTIFUL DESIGN
═══════════════════════════════════════════════════════════════════ */
const TapButton = memo(function TapButton({
  onTap,
  energy,
  maxEnergy,
  isDisabled,
  combo,
}: {
  onTap: () => void;
  energy: number;
  maxEnergy: number;
  isDisabled: boolean;
  combo: number;
}) {
  const [scale, setScale] = useState(1);

  return (
    <div className="tap-button-container">
      <motion.button
        onMouseDown={() => !isDisabled && setScale(0.88)}
        onMouseUp={() => setScale(1)}
        onMouseLeave={() => setScale(1)}
        onClick={onTap}
        disabled={isDisabled}
        animate={{ scale }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="tap-button"
      >
        {/* Glow Effect */}
        <motion.div
          className="tap-glow"
          animate={{
            boxShadow: [
              "0 0 20px rgba(251, 191, 36, 0.3)",
              "0 0 40px rgba(251, 191, 36, 0.6)",
              "0 0 20px rgba(251, 191, 36, 0.3)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Main Circle */}
        <div className="tap-button-main">
          <span className="tap-button-icon">💎</span>
          <p className="tap-button-text">TAP</p>
        </div>

        {/* Energy Ring */}
        <motion.svg
          className="tap-energy-ring"
          viewBox="0 0 100 100"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(34, 211, 238, 0.3)"
            strokeWidth="2"
            strokeDasharray={`${(energy / maxEnergy) * 283} 283`}
          />
        </motion.svg>

        {/* Combo Badge */}
        {combo > 0 && (
          <motion.div
            className="tap-combo-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <span className="tap-combo-text">×{combo}</span>
          </motion.div>
        )}

        {/* Disabled Overlay */}
        {isDisabled && (
          <div className="tap-disabled-overlay">
            <span className="text-2xl">⚠️</span>
            <p>Out of Energy</p>
          </div>
        )}
      </motion.button>

      {/* Energy Bar Below */}
      <div className="tap-energy-bar-container">
        <div className="tap-energy-label">
          <span>Energy</span>
          <span className="tap-energy-value">{Math.round(energy)}/{maxEnergy}</span>
        </div>
        <div className="tap-energy-bar">
          <motion.div
            className="tap-energy-fill"
            animate={{ width: `${(energy / maxEnergy) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   STATS DISPLAY - HAMSTER BOT STYLE
═══════════════════════════════════════════════════════════════════ */
const StatsDisplay = memo(function StatsDisplay({ stats }: { stats: UserStats }) {
  return (
    <div className="stats-grid">
      {/* Main Points */}
      <motion.div
        className="stat-card stat-card-main"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="stat-card-inner">
          <p className="stat-label">💰 Points</p>
          <motion.p
            className="stat-value-main"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
          >
            {parseInt(stats.points).toLocaleString()}
          </motion.p>
        </div>
      </motion.div>

      {/* Level */}
      <motion.div
        className="stat-card stat-card-level"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <p className="stat-label">⭐ Level</p>
        <p className="stat-value">{stats.level}</p>
      </motion.div>

      {/* PPH */}
      <motion.div
        className="stat-card stat-card-pph"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <p className="stat-label">💰 PPH</p>
        <p className="stat-value">{stats.pph}</p>
      </motion.div>

      {/* Stars */}
      <motion.div
        className="stat-card stat-card-stars"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <p className="stat-label">⭐ Stars</p>
        <p className="stat-value">{stats.stars}</p>
      </motion.div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   WALLET CONNECTION
═══════════════════════════════════════════════════════════════════ */
const WalletButton = memo(function WalletButton({
  connected,
  address,
  onConnect,
}: {
  connected: boolean;
  address: string;
  onConnect: () => void;
}) {
  return (
    <motion.button
      onClick={onConnect}
      className={`wallet-button ${connected ? "connected" : ""}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Wallet size={16} />
      <span>
        {connected ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connect Wallet"}
      </span>
    </motion.button>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   UPGRADE CARD
═══════════════════════════════════════════════════════════════════ */
const UpgradeCard = memo(function UpgradeCard({
  upgrade,
  onBuy,
  canAfford,
}: {
  upgrade: Upgrade;
  onBuy: () => void;
  canAfford: boolean;
}) {
  return (
    <motion.div
      className={`upgrade-card upgrade-category-${upgrade.category}`}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="upgrade-header">
        <span className="upgrade-icon">{upgrade.icon}</span>
        <div className="upgrade-info">
          <p className="upgrade-name">{upgrade.name}</p>
          <p className="upgrade-desc">{upgrade.description}</p>
        </div>
        <div className="upgrade-level">
          <span className="upgrade-level-badge">Lv.{upgrade.level}</span>
        </div>
      </div>

      <div className="upgrade-footer">
        <div className="upgrade-price">
          <span className={`upgrade-price-icon ${upgrade.priceType}`}>
            {upgrade.priceType === "stars" ? "⭐" : "💰"}
          </span>
          <span className="upgrade-price-value">{upgrade.price}</span>
        </div>
        <motion.button
          className={`upgrade-button ${canAfford ? "affordable" : "unaffordable"}`}
          onClick={onBuy}
          disabled={!canAfford}
          whileTap={{ scale: 0.95 }}
        >
          {canAfford ? "Buy" : "Can't Afford"}
        </motion.button>
      </div>

      {/* Progress Bar */}
      <div className="upgrade-progress">
        <div className="upgrade-progress-bar">
          <motion.div
            className="upgrade-progress-fill"
            animate={{ width: `${(upgrade.level / upgrade.maxLevel) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="upgrade-progress-text">
          {upgrade.level}/{upgrade.maxLevel}
        </span>
      </div>
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   LANGUAGE SWITCHER
═══════════════════════════════════════════════════════════════════ */
const LanguageSwitcher = memo(function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [showLangs, setShowLangs] = useState(false);

  const languages = [
    { code: "ar", name: "العربية" },
    { code: "en", name: "English" },
    { code: "fa", name: "فارسی" },
    { code: "ru", name: "Русский" },
    { code: "tr", name: "Türkçe" },
  ];

  return (
    <div className="language-switcher">
      <motion.button
        className="lang-button"
        onClick={() => setShowLangs(!showLangs)}
        whileTap={{ scale: 0.95 }}
      >
        <span>🌐</span>
        <span>{i18n.language.toUpperCase()}</span>
      </motion.button>

      <AnimatePresence>
        {showLangs && (
          <motion.div
            className="lang-dropdown"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {languages.map((lang) => (
              <motion.button
                key={lang.code}
                className={`lang-option ${i18n.language === lang.code ? "active" : ""}`}
                onClick={() => {
                  i18n.changeLanguage(lang.code);
                  setShowLangs(false);
                }}
                whileHover={{ x: 4 }}
              >
                {lang.name}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   NAVIGATION BAR
═══════════════════════════════════════════════════════════════════ */
const BottomNav = memo(function BottomNav({
  active,
  onChange,
}: {
  active: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}) {
  const navItems: Array<{ id: ActiveTab; icon: string; label: string }> = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "upgrades", icon: "⚡", label: "Upgrades" },
    { id: "tasks", icon: "📋", label: "Tasks" },
    { id: "friends", icon: "👥", label: "Friends" },
    { id: "leaderboard", icon: "🏆", label: "Rank" },
  ];

  return (
    <motion.div className="bottom-nav" initial={{ y: 100 }} animate={{ y: 0 }}>
      <div className="bottom-nav-inner">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            className={`nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => onChange(item.id)}
            whileTap={{ scale: 0.9 }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {active === item.id && <motion.div className="nav-indicator" layoutId="active" />}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   HOME SCREEN
═══════════════════════════════════════════════════════════════════ */
const HomeScreen = memo(function HomeScreen({
  stats,
  onTap,
  onShowDaily,
  onWalletConnect,
}: {
  stats: UserStats;
  onTap: () => void;
  onShowDaily: () => void;
  onWalletConnect: () => void;
}) {
  const { i18n } = useTranslation();
  const isRTL = ["ar", "fa"].includes(i18n.language);

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`screen home-screen ${isRTL ? "rtl" : "ltr"}`}
    >
      {/* Header */}
      <div className="screen-header">
        <LanguageSwitcher />
        <WalletButton
          connected={stats.walletConnected}
          address={stats.walletAddress}
          onConnect={onWalletConnect}
        />
      </div>

      {/* Stats */}
      <StatsDisplay stats={stats} />

      {/* Tap Button */}
      <TapButton
        onTap={onTap}
        energy={stats.energy}
        maxEnergy={stats.maxEnergy}
        isDisabled={stats.energy < 10}
        combo={stats.combo}
      />

      {/* Daily Rewards */}
      <motion.button
        className="daily-button"
        onClick={onShowDaily}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="daily-icon">🎁</span>
        <div className="daily-content">
          <p className="daily-title">Daily Rewards</p>
          <p className="daily-subtitle">Claim your daily bonus</p>
        </div>
        <span className="daily-arrow">→</span>
      </motion.button>

      {/* Quick Stats */}
      <div className="quick-stats">
        <GlowingBadge color="gold">
          <span>🔥</span>
          <span>Combo: ×{stats.combo}</span>
        </GlowingBadge>
        <GlowingBadge color="cyan">
          <Sparkles size={14} />
          <span>Streak: 12 days</span>
        </GlowingBadge>
      </div>
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   UPGRADES SCREEN
═══════════════════════════════════════════════════════════════════ */
const UpgradesScreen = memo(function UpgradesScreen({
  stats,
}: {
  stats: UserStats;
}) {
  const categories = [
    { id: "tap", name: "⚒️ Tap Power", emojis: ["⚒️", "✨", "💥"] },
    { id: "energy", name: "🔋 Energy", emojis: ["🔋", "⚡", "🛡️"] },
    { id: "autotap", name: "🤖 Auto Tap", emojis: ["🤖", "⚡", "🚀"] },
  ];

  return (
    <motion.div
      key="upgrades"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="screen upgrades-screen"
    >
      <h1 className="screen-title">⚡ Upgrades & Boosts</h1>

      {categories.map((category) => (
        <div key={category.id} className="upgrade-category">
          <h2 className="category-title">{category.name}</h2>
          <div className="upgrade-list">
            {UPGRADES.filter((u) => u.category === category.id).map((upgrade) => (
              <UpgradeCard
                key={upgrade.id}
                upgrade={upgrade}
                onBuy={() =>
                  toast.success(
                    `Purchased ${upgrade.name} for ${upgrade.price} ${
                      upgrade.priceType === "stars" ? "⭐" : "💰"
                    }`
                  )
                }
                canAfford={
                  upgrade.priceType === "stars"
                    ? stats.stars >= upgrade.price
                    : parseInt(stats.points) >= upgrade.price
                }
              />
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   TASKS SCREEN
═══════════════════════════════════════════════════════════════════ */
const TasksScreen = memo(function TasksScreen() {
  const tasks = [
    {
      id: 1,
      title: "Follow on Twitter",
      reward: 1000,
      icon: "🐦",
      completed: false,
    },
    { id: 2, title: "Join Discord", reward: 1500, icon: "💜", completed: false },
    { id: 3, title: "Visit Website", reward: 500, icon: "🌐", completed: true },
  ];

  return (
    <motion.div
      key="tasks"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="screen tasks-screen"
    >
      <h1 className="screen-title">📋 Tasks & Missions</h1>
      <div className="tasks-list">
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            className={`task-item ${task.completed ? "completed" : ""}`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="task-left">
              <span className="task-icon">{task.icon}</span>
              <div className="task-info">
                <p className="task-title">{task.title}</p>
                <p className="task-reward">+{task.reward} points</p>
              </div>
            </div>
            <motion.button
              className="task-button"
              whileTap={{ scale: 0.95 }}
              disabled={task.completed}
            >
              {task.completed ? "✅" : "Start"}
            </motion.button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   FRIENDS SCREEN
═══════════════════════════════════════════════════════════════════ */
const FriendsScreen = memo(function FriendsScreen() {
  return (
    <motion.div
      key="friends"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="screen friends-screen"
    >
      <h1 className="screen-title">👥 Friends & Referrals</h1>
      <motion.button
        className="referral-button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>🔗 Copy Referral Link</span>
      </motion.button>
      <div className="friends-list">
        {[
          { name: "Ali", points: 250, streak: 5 },
          { name: "Sara", points: 500, streak: 12 },
          { name: "Ahmed", points: 1000, streak: 30 },
        ].map((friend, i) => (
          <motion.div
            key={i}
            className="friend-item"
            whileHover={{ x: 4 }}
          >
            <div className="friend-avatar">{friend.name[0]}</div>
            <div className="friend-info">
              <p className="friend-name">{friend.name}</p>
              <p className="friend-points">{friend.points} points • {friend.streak} days</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   LEADERBOARD SCREEN
═══════════════════════════════════════════════════════════════════ */
const LeaderboardScreen = memo(function LeaderboardScreen() {
  return (
    <motion.div
      key="leaderboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="screen leaderboard-screen"
    >
      <h1 className="screen-title">🏆 Global Leaderboard</h1>
      <div className="leaderboard-list">
        {[
          { rank: 1, name: "You", points: 2500000, icon: "👑" },
          { rank: 2, name: "Ahmed", points: 2480000, icon: "🥈" },
          { rank: 3, name: "Sara", points: 2450000, icon: "🥉" },
          { rank: 4, name: "Ali", points: 2410000, icon: "4️⃣" },
          { rank: 5, name: "Fatima", points: 2350000, icon: "5️⃣" },
        ].map((item) => (
          <motion.div
            key={item.rank}
            className={`leaderboard-item rank-${item.rank}`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="leaderboard-rank">{item.icon}</div>
            <div className="leaderboard-info">
              <p className="leaderboard-name">{item.name}</p>
              <p className="leaderboard-points">{item.points.toLocaleString()}</p>
            </div>
            <div className="leaderboard-position">#{item.rank}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [stats, setStats] = useState<UserStats>(initialStats);
  const [showDaily, setShowDaily] = useState(false);
  const [rewards] = useState(() => generateDailyRewards());

  const handleTap = useThrottle(() => {
    if (stats.energy < 10) {
      toast.error("No energy! Recharging...");
      return;
    }

    const tapValue = 10;
    setStats((prev) => ({
      ...prev,
      points: String(parseInt(prev.points) + tapValue),
      energy: Math.max(prev.energy - 5, 0),
      combo: Math.min(prev.combo + 1, 100),
    }));
  }, 80);

  // Energy recharge
  useEffect(() => {
    if (stats.energy >= stats.maxEnergy) return;
    const timer = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        energy: Math.min(prev.energy + 1, prev.maxEnergy),
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, [stats.energy, stats.maxEnergy]);

  const handleWalletConnect = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      walletConnected: !prev.walletConnected,
      walletAddress: prev.walletConnected
        ? ""
        : "0x" + Math.random().toString(16).slice(2, 10),
    }));
    toast.success(stats.walletConnected ? "Wallet disconnected" : "Wallet connected!");
  }, [stats.walletConnected]);

  const handleClaimDaily = useCallback((day: number) => {
    const reward = rewards[day - 1];
    if (reward) {
      const amount = Math.floor(reward.baseReward * reward.multiplier);
      setStats((prev) => ({
        ...prev,
        points: String(parseInt(prev.points) + amount),
      }));
      toast.success(`+${amount} points! 🎉`);
    }
  }, [rewards]);

  return (
    <div className="app-container">
      <AnimatePresence mode="wait">
        {activeTab === "home" && (
          <HomeScreen
            stats={stats}
            onTap={handleTap}
            onShowDaily={() => setShowDaily(true)}
            onWalletConnect={handleWalletConnect}
          />
        )}
        {activeTab === "upgrades" && <UpgradesScreen stats={stats} />}
        {activeTab === "tasks" && <TasksScreen />}
        {activeTab === "friends" && <FriendsScreen />}
        {activeTab === "leaderboard" && <LeaderboardScreen />}
      </AnimatePresence>

      <BottomNav active={activeTab} onChange={setActiveTab} />

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
