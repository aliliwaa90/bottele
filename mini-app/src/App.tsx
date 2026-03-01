import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Coins,
  Crown,
  Globe,
  Home,
  ListChecks,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import WebApp from "@twa-dev/sdk";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import {
  getTelegramInitData,
  getTelegramUser,
  initTelegram,
  isTelegramWebApp,
  openTelegramInvoice
} from "@/lib/telegram";
import { cn, formatNumber } from "@/lib/utils";
import type { LeaderboardItem, Task, Upgrade, User } from "@/types/api";

const RTL_LANGS = new Set(["ar", "fa"]);
const SUPPORTED_LANGS = ["ar", "en", "ru", "tr", "es", "fa", "id"] as const;

type BoardType = "global" | "weekly" | "friends";
type ActiveTab = "home" | "upgrades" | "tasks" | "friends" | "leaderboard";
type TaskFilter = "all" | "DAILY" | "SOCIAL" | "CIPHER";

type FloatingGain = { id: number; value: number; left: number; top: number; burst: boolean };
type ReferralStats = {
  level1Count: number;
  level2Count: number;
  estimatedRewards: number;
  referrals: Array<{ id: string; name: string; points: string }>;
};

type NavItem = {
  key: ActiveTab;
  labelAr: string;
  labelEn: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { key: "home", labelAr: "الرئيسية", labelEn: "Home", icon: Home },
  { key: "upgrades", labelAr: "المتجر", labelEn: "Store", icon: TrendingUp },
  { key: "tasks", labelAr: "المهام", labelEn: "Tasks", icon: ListChecks },
  { key: "friends", labelAr: "الأصدقاء", labelEn: "Friends", icon: Users },
  { key: "leaderboard", labelAr: "الصدارة", labelEn: "Top", icon: Trophy }
];

const TAP_FLUSH_DELAY_MS = 18;
const TURBO_TAP_SIZE = 10;
const TURBO_COOLDOWN_MS = 4500;
const TAP_FLUSH_BATCH = 400;
const TAP_FLUSH_IMMEDIATE_THRESHOLD = 6;
const ENERGY_WARNING_COOLDOWN_MS = 900;

type TonWalletConnectProps = {
  className?: string;
  manifestUrl: string;
};

const TonWalletConnectLazy = lazy(async () => {
  const module = await import("@tonconnect/ui-react");
  const Component = ({ className, manifestUrl }: TonWalletConnectProps) => (
    <module.TonConnectUIProvider manifestUrl={manifestUrl}>
      <module.TonConnectButton className={className} />
    </module.TonConnectUIProvider>
  );
  return { default: Component };
});

type AudioContextCtor = typeof AudioContext;
let sharedAudioContext: AudioContext | null = null;

function getAudioContextSafe(): AudioContext | null {
  if (sharedAudioContext) return sharedAudioContext;
  const AudioContextClass =
    window.AudioContext ||
    ((window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ?? null);
  if (!AudioContextClass) return null;
  sharedAudioContext = new AudioContextClass();
  return sharedAudioContext;
}

function playTapSound() {
  const context = getAudioContextSafe();
  if (!context) return;

  if (context.state === "suspended") {
    void context.resume().catch(() => undefined);
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = 420;
  gain.gain.setValueAtTime(0.07, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.07);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.07);
}

function rankMark(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

function categoryStyle(category: string): string {
  switch (category) {
    case "tap":
      return "from-orange-500/25 via-amber-500/15 to-transparent";
    case "pph":
      return "from-cyan-500/25 via-blue-500/15 to-transparent";
    case "energy":
      return "from-emerald-500/25 via-green-500/15 to-transparent";
    case "autotap":
      return "from-violet-500/25 via-fuchsia-500/15 to-transparent";
    case "legendary":
      return "from-yellow-400/30 via-orange-500/20 to-transparent";
    default:
      return "from-slate-500/20 via-slate-500/10 to-transparent";
  }
}

function numericFromString(input: string): number {
  try {
    const value = BigInt(input);
    const max = BigInt(Number.MAX_SAFE_INTEGER);
    if (value > max) return Number.MAX_SAFE_INTEGER;
    return Number(value);
  } catch {
    return Number(input) || 0;
  }
}

function addToNumericString(value: string, increment: number) {
  if (increment <= 0) return value;
  try {
    return (BigInt(value) + BigInt(increment)).toString();
  } catch {
    return String((Number(value) || 0) + increment);
  }
}

function formatFullNumber(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.floor(num));
}

export default function App() {
  const { t, i18n } = useTranslation();
  const tonManifestUrl =
    import.meta.env.VITE_TON_MANIFEST_URL ?? "https://bottele-mini-app.vercel.app/tonconnect-manifest.json";
  const socketEnabled = import.meta.env.VITE_DISABLE_SOCKET !== "true";
  const botUsername =
    (import.meta.env.VITE_BOT_USERNAME ?? import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? "")
      .toString()
      .replace("@", "")
      .trim();

  const [loading, setLoading] = useState(true);
  const [outsideTelegram, setOutsideTelegram] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [tabDirection, setTabDirection] = useState(1);
  const [leaderboardType, setLeaderboardType] = useState<BoardType>("global");
  const [upgradeFilter, setUpgradeFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [referral, setReferral] = useState<{ directReferrals: number; referralCode: string } | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [activeEvents, setActiveEvents] = useState<
    Array<{ id: string; nameAr: string; nameEn: string; multiplier: number }>
  >([]);
  const [cipherInput, setCipherInput] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [tapAnimating, setTapAnimating] = useState(false);
  const [floatingGains, setFloatingGains] = useState<FloatingGain[]>([]);
  const [turboCooldownUntil, setTurboCooldownUntil] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [isSyncingTaps, setIsSyncingTaps] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const userRef = useRef<User | null>(null);
  const pendingTapsRef = useRef(0);
  const flushingTapsRef = useRef(false);
  const tapFlushTimerRef = useRef<number | null>(null);
  const lastSoundAtRef = useRef(0);
  const lastEnergyWarningAtRef = useRef(0);

  const isRtl = RTL_LANGS.has(i18n.language);
  const displayName =
    user?.firstName?.trim() ||
    user?.username?.trim() ||
    `${t("leaderboard.player")} #${String(user?.telegramId ?? "").slice(-4) || "0000"}`;

  const referralLink = useMemo(() => {
    const code = referral?.referralCode?.trim();
    if (!code || !botUsername) {
      return "";
    }
    return `https://t.me/${botUsername}?start=${encodeURIComponent(code)}`;
  }, [botUsername, referral?.referralCode]);

  const energyPercent = useMemo(() => {
    if (!user || user.maxEnergy === 0) return 0;
    return Math.round((user.energy / user.maxEnergy) * 100);
  }, [user]);

  const turboCooldownSeconds = useMemo(() => {
    const diff = Math.max(0, turboCooldownUntil - nowTick);
    return Math.ceil(diff / 1000);
  }, [turboCooldownUntil, nowTick]);

  const pointsNumber = useMemo(() => numericFromString(user?.points ?? "0"), [user?.points]);

  const playerLevel = useMemo(() => {
    if (!user) return 1;
    const levelFromScore = Math.floor(Math.pow(pointsNumber + 400, 0.17));
    return Math.min(105, Math.max(1, levelFromScore));
  }, [pointsNumber, user]);

  const levelProgress = useMemo(() => {
    if (!user || playerLevel >= 105) return 100;
    const prevNeed = Math.floor(Math.pow(playerLevel + 2, 3) * 120);
    const nextNeed = Math.floor(Math.pow(playerLevel + 3, 3) * 120);
    const current = pointsNumber;
    if (current <= prevNeed) return 0;
    const ratio = (current - prevNeed) / Math.max(1, nextNeed - prevNeed);
    return Math.min(100, Math.max(0, Math.round(ratio * 100)));
  }, [playerLevel, pointsNumber, user]);

  const upgradeCategories = useMemo(
    () => ["all", ...Array.from(new Set(upgrades.map((upgrade) => upgrade.category)))],
    [upgrades]
  );

  const filteredUpgrades = useMemo(
    () =>
      upgrades
        .filter((upgrade) => (upgradeFilter === "all" ? true : upgrade.category === upgradeFilter))
        .slice()
        .sort((a, b) => a.unlockLevel - b.unlockLevel || a.baseCost - b.baseCost),
    [upgrades, upgradeFilter]
  );

  const filteredTasks = useMemo(
    () => tasks.filter((task) => (taskFilter === "all" ? true : task.type === taskFilter)),
    [tasks, taskFilter]
  );

  const topThreeLeaders = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const restLeaders = useMemo(() => leaderboard.slice(3), [leaderboard]);

  const navActiveIndex = useMemo(() => {
    const index = NAV_ITEMS.findIndex((item) => item.key === activeTab);
    return index < 0 ? 0 : index;
  }, [activeTab]);

  const handleTabChange = (nextTab: ActiveTab) => {
    if (nextTab === activeTab) return;
    const nextIndex = NAV_ITEMS.findIndex((item) => item.key === nextTab);
    setTabDirection(nextIndex > navActiveIndex ? 1 : -1);
    setActiveTab(nextTab);
  };

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  async function refreshFastData() {
    const gameState = await api.gameMe();
    setUser(gameState.user);
    setUpgrades(gameState.upgrades);
    setReferral(gameState.referral);
    setActiveEvents(gameState.activeEvents);
  }

  async function refreshSecondaryData(currentBoardType: BoardType) {
    const [taskState, board, referrals] = await Promise.all([
      api.getTasks(),
      api.leaderboard(currentBoardType),
      api.referrals()
    ]);
    setTasks(taskState.tasks);
    setLeaderboard(board);
    setReferralStats(referrals);
  }

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        initTelegram();
        const inTelegram = isTelegramWebApp();
        const params = new URLSearchParams(window.location.search);
        const allowExternal = params.get("dev") === "1";
        if (!inTelegram && !allowExternal) {
          setOutsideTelegram(true);
          setLoading(false);
          return;
        }

        const tgUser = getTelegramUser();
        const tgInitData = getTelegramInitData();
        const fallbackId = localStorage.getItem("vaulttap-local-id") ?? String(Date.now()).slice(-10);
        localStorage.setItem("vaulttap-local-id", fallbackId);
        const referralCode = params.get("startapp") || params.get("ref") || undefined;

        const login = await api.login({
          telegramId: tgUser?.id ?? fallbackId,
          username: tgUser?.username,
          firstName: tgUser?.first_name,
          lastName: tgUser?.last_name,
          language: tgUser?.language_code ?? "ar",
          referralCode,
          initData: tgInitData ?? undefined
        });

        api.setToken(login.token);

        if (socketEnabled) {
          const socket = connectSocket(login.token);
          socket.on("user:update", (payload: User) => {
            if (!mounted) return;
            setUser(payload);
          });
          socket.on("leaderboard:update", (payload: LeaderboardItem[]) => {
            if (!mounted || leaderboardType !== "global") return;
            setLeaderboard(payload);
          });
          socket.on("mass:notification", (payload: { title: string; body: string }) => {
            toast.info(payload.title, { description: payload.body });
          });
        }

        await refreshFastData();
        if (mounted) {
          setLoading(false);
        }

        void refreshSecondaryData(leaderboardType).catch(() => undefined);

        if (SUPPORTED_LANGS.includes(login.user.language as (typeof SUPPORTED_LANGS)[number])) {
          await i18n.changeLanguage(login.user.language);
        } else {
          await i18n.changeLanguage("ar");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t("common.error");
        toast.error(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void init();

    return () => {
      mounted = false;
      if (socketEnabled) {
        disconnectSocket();
      }
      if (tapFlushTimerRef.current !== null) {
        window.clearTimeout(tapFlushTimerRef.current);
        tapFlushTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    void api.leaderboard(leaderboardType).then(setLeaderboard).catch(() => undefined);
  }, [leaderboardType, user?.id]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [i18n.language, isRtl]);

  const activeEventMultiplier = () =>
    activeEvents.reduce((highest, event) => Math.max(highest, event.multiplier), 1);

  const addFloatingGain = (value: number, burst = false) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const gain = {
      id,
      value,
      left: 46 + Math.random() * 12,
      top: 41 + Math.random() * 14,
      burst
    };
    setFloatingGains((prev) => [...prev.slice(-7), gain]);
    window.setTimeout(() => {
      setFloatingGains((prev) => prev.filter((item) => item.id !== id));
    }, burst ? 1050 : 820);
  };

  const scheduleTapFlush = (delay = TAP_FLUSH_DELAY_MS) => {
    if (tapFlushTimerRef.current !== null) return;
    tapFlushTimerRef.current = window.setTimeout(() => {
      tapFlushTimerRef.current = null;
      void flushTapQueue();
    }, delay);
  };

  const flushTapQueue = async () => {
    if (flushingTapsRef.current) return;
    if (pendingTapsRef.current <= 0) return;

    flushingTapsRef.current = true;
    setIsSyncingTaps(true);
    const batch = Math.min(TAP_FLUSH_BATCH, pendingTapsRef.current);
    pendingTapsRef.current -= batch;

    try {
      const response = await api.tap(batch);
      userRef.current = response.user;
      setUser(response.user);
    } catch (error) {
      pendingTapsRef.current = 0;
      toast.error(error instanceof Error ? error.message : t("common.error"));
      try {
        const state = await api.gameMe();
        userRef.current = state.user;
        setUser(state.user);
        setUpgrades(state.upgrades);
        setReferral(state.referral);
        setActiveEvents(state.activeEvents);
      } catch {
        // Keep optimistic state if sync fails.
      }
    } finally {
      flushingTapsRef.current = false;
      if (pendingTapsRef.current > 0) {
        scheduleTapFlush(10);
      } else {
        setIsSyncingTaps(false);
      }
    }
  };

  const queueTaps = (requestedTaps: number): number => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.energy <= 0 || requestedTaps <= 0) {
      return 0;
    }

    const realTaps = Math.min(requestedTaps, currentUser.energy);
    const estimatedPerTap = Math.max(
      1,
      Math.floor(currentUser.tapPower * currentUser.comboMultiplier * activeEventMultiplier())
    );
    const estimatedGain = estimatedPerTap * realTaps;

    const nextEnergy = Math.max(0, currentUser.energy - realTaps);
    const nextPoints = addToNumericString(currentUser.points, estimatedGain);
    const nextTotalTaps = addToNumericString(currentUser.totalTaps, realTaps);

    const nextUser: User = {
      ...currentUser,
      energy: nextEnergy,
      points: nextPoints,
      totalTaps: nextTotalTaps
    };

    userRef.current = nextUser;
    setUser(nextUser);
    addFloatingGain(estimatedGain);

    pendingTapsRef.current += realTaps;
    if (pendingTapsRef.current >= TAP_FLUSH_IMMEDIATE_THRESHOLD) {
      void flushTapQueue();
    } else {
      scheduleTapFlush();
    }
    return realTaps;
  };

  const handleTap = () => {
    const accepted = queueTaps(1);
    if (accepted === 0) {
      const now = Date.now();
      if (now - lastEnergyWarningAtRef.current >= ENERGY_WARNING_COOLDOWN_MS) {
        toast.warning(t("tap.energyLow"));
        lastEnergyWarningAtRef.current = now;
      }
      return;
    }

    setTapAnimating(true);
    const now = Date.now();
    if (now - lastSoundAtRef.current > 42) {
      playTapSound();
      lastSoundAtRef.current = now;
    }
    try {
      WebApp.HapticFeedback.impactOccurred("light");
    } catch {
      // Ignore haptic issues outside Telegram clients.
    }
    setTimeout(() => setTapAnimating(false), 120);
  };

  const handleTurboTap = () => {
    const now = Date.now();
    if (now < turboCooldownUntil) {
      toast.warning(isRtl ? `انتظر ${turboCooldownSeconds} ثانية` : `Wait ${turboCooldownSeconds}s`);
      return;
    }

    const accepted = queueTaps(TURBO_TAP_SIZE);
    if (accepted === 0) {
      if (now - lastEnergyWarningAtRef.current >= ENERGY_WARNING_COOLDOWN_MS) {
        toast.warning(t("tap.energyLow"));
        lastEnergyWarningAtRef.current = now;
      }
      return;
    }

    const snapshot = userRef.current;
    if (snapshot) {
      addFloatingGain(
        Math.max(
          1,
          Math.floor(TURBO_TAP_SIZE * snapshot.tapPower * snapshot.comboMultiplier * activeEventMultiplier())
        ),
        true
      );
    }
    setTurboCooldownUntil(now + TURBO_COOLDOWN_MS);
    setTapAnimating(true);
    playTapSound();
    try {
      WebApp.HapticFeedback.impactOccurred("medium");
    } catch {
      // Ignore haptic issues outside Telegram clients.
    }
    setTimeout(() => setTapAnimating(false), 180);
  };

  const handleBuyUpgrade = async (upgradeId: string) => {
    try {
      await flushTapQueue();
      const result = await api.buyUpgrade(upgradeId);
      setUser(result.user);
      userRef.current = result.user;
      const gameState = await api.gameMe();
      setUpgrades(gameState.upgrades);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  };

  const handleStarsUpgrade = async (upgrade: Upgrade) => {
    if (!upgrade.starsPrice || upgrade.starsPrice <= 0) {
      toast.warning(isRtl ? "هذه الترقية لا تدعم النجوم" : "This upgrade is not available for Stars.");
      return;
    }

    try {
      await flushTapQueue();
      const invoice = await api.createStarsInvoice(upgrade.key);
      const status = await openTelegramInvoice(invoice.invoiceLink);

      if (status === "paid") {
        toast.success(
          isRtl ? "تم الدفع بالنجوم بنجاح. جاري تحديث الترقية..." : "Stars payment completed. Updating..."
        );
        await refreshFastData();
        return;
      }

      if (status === "cancelled") {
        toast.info(isRtl ? "تم إلغاء الدفع." : "Payment cancelled.");
        return;
      }

      if (status === "failed") {
        toast.error(isRtl ? "فشل الدفع، أعد المحاولة." : "Payment failed. Try again.");
        return;
      }

      if (status === "unsupported") {
        window.open(invoice.invoiceLink, "_blank", "noopener,noreferrer");
        toast.info(
          isRtl
            ? "تم فتح رابط الفاتورة. أكمل الدفع داخل تيليجرام."
            : "Invoice opened by link. Complete payment in Telegram."
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  };

  const handleClaimTask = async (task: Task) => {
    try {
      await flushTapQueue();
      const result = await api.claimTask(task.id, task.type === "CIPHER" ? cipherInput : undefined);
      toast.success(`${result.message} +${result.reward}`);
      const [taskState, gameState] = await Promise.all([api.getTasks(), api.gameMe()]);
      setTasks(taskState.tasks);
      setUser(gameState.user);
      userRef.current = gameState.user;
      setCipherInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  };

  const handleClaimAirdrop = async () => {
    if (!walletAddress.trim()) {
      toast.warning(t("wallet.placeholder"));
      return;
    }
    try {
      await flushTapQueue();
      const result = await api.claimAirdrop(walletAddress.trim());
      toast.success(`${t("wallet.claim")} ${formatNumber(result.estimatedJetton)}`);
      setWalletAddress(result.walletAddress);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard
      .writeText(referral?.referralCode ?? "")
      .then(() => {
        toast.success(isRtl ? "تم النسخ" : "Copied");
      })
      .catch(() => {
        toast.error(isRtl ? "تعذر النسخ" : "Failed to copy");
      });
  };

  const copyReferralLink = () => {
    if (!referralLink) {
      toast.warning(
        isRtl ? "أضف VITE_BOT_USERNAME لتفعيل رابط الدعوة." : "Set VITE_BOT_USERNAME to enable invite links."
      );
      return;
    }
    navigator.clipboard
      .writeText(referralLink)
      .then(() => toast.success(isRtl ? "تم نسخ رابط الدعوة" : "Invite link copied"))
      .catch(() => toast.error(isRtl ? "تعذر نسخ الرابط" : "Failed to copy invite link"));
  };

  const shareReferralLink = () => {
    if (!referralLink) {
      toast.warning(
        isRtl ? "أضف VITE_BOT_USERNAME لتفعيل رابط الدعوة." : "Set VITE_BOT_USERNAME to enable invite links."
      );
      return;
    }
    const text = isRtl
      ? "انضم إلى VaultTap من هذا الرابط وخذ مكافأة 1000 نقطة:"
      : "Join VaultTap using this link and get 1000 points:";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    try {
      if (isTelegramWebApp()) {
        WebApp.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
  };

  const canAfford = (cost: number, points: string): boolean => {
    try {
      return BigInt(points) >= BigInt(cost);
    } catch {
      return Number(points) >= cost;
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
        <Card className="w-full border-primary/30 bg-card/85">
          <CardContent className="p-6 text-center text-lg font-semibold">{t("common.loading")}</CardContent>
        </Card>
      </div>
    );
  }

  if (outsideTelegram) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
        <Card className="w-full border-amber-400/40 bg-card/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-300">
              <ShieldCheck size={18} />
              VaultTap Security Shield
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {isRtl
                ? "هذه الواجهة تعمل من داخل Telegram فقط لحماية حسابات اللاعبين."
                : "This interface works only inside Telegram to protect player accounts."}
            </p>
            <p className="text-muted-foreground">
              {isRtl
                ? "افتح البوت ثم اضغط على زر فتح VaultTap Mini App."
                : "Open the bot and tap the Open VaultTap Mini App button."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
        <Card className="w-full">
          <CardContent className="p-6 text-center">{t("common.error")}</CardContent>
        </Card>
      </div>
    );
  }

  const homeScreen = (
    <section className="vt-home-screen">
      <header className="vt-home-top">
        <div className="vt-brand-block">
          <p className="vt-brand-title">VaultTap</p>
          <p className="vt-brand-sub">{isRtl ? "نسخة جديدة كلياً" : "Full new experience"}</p>
        </div>
        <div className="vt-top-actions">
          <button type="button" className="vt-icon-btn" onClick={() => setSettingsOpen(true)}>
            <Settings size={18} />
          </button>
          <button type="button" className="vt-icon-btn" onClick={() => handleTabChange("leaderboard")}>
            <Trophy size={18} />
          </button>
        </div>
      </header>

      <div className="vt-player-banner">
        <div>
          <p className="vt-player-name">{displayName}</p>
          <p className="vt-player-level">
            {isRtl ? "المستوى" : "Level"} {playerLevel}/105
          </p>
        </div>
        <Badge variant="outline" className="vt-live-badge">
          {isRtl ? "متصل" : "Online"}
        </Badge>
      </div>

      {activeEvents.length > 0 ? (
        <div className="vt-live-event">
          <Sparkles size={14} />
          <span>
            {isRtl ? "حدث نشط" : "Live Event"}:{" "}
            {activeEvents
              .slice(0, 2)
              .map((event) => `${isRtl ? event.nameAr : event.nameEn} x${event.multiplier}`)
              .join(" • ")}
          </span>
        </div>
      ) : null}

      <div className="vt-balance-box">
        <p className="vt-balance">{formatFullNumber(user.points)}</p>
        <p className="vt-balance-label">{isRtl ? "إجمالي النقاط المكتسبة" : "Total earned points"}</p>
        <div className="vt-level-progress">
          <div className="vt-level-progress-head">
            <span>{isRtl ? "تقدم المستوى" : "Level progress"}</span>
            <span>{levelProgress}%</span>
          </div>
          <Progress value={levelProgress} className="h-2.5" />
        </div>
      </div>

      <div className="vt-stats-row">
        <StatBox label={t("stats.energy")} value={`${user.energy}/${user.maxEnergy}`} icon={<Zap size={14} />} />
        <StatBox label={t("stats.combo")} value={`${user.comboMultiplier.toFixed(2)}x`} icon={<Crown size={14} />} />
        <StatBox label="PPH" value={formatNumber(user.pph)} icon={<Coins size={14} />} />
      </div>

      <div className="vt-energy-strip">
        <div className="vt-energy-strip-head">
          <span>{isRtl ? "تعبئة الطاقة" : "Energy Recharge"}</span>
          <span>{energyPercent}%</span>
        </div>
        <Progress value={energyPercent} className="h-2.5" />
      </div>

      <div className="vt-tap-zone">
        {floatingGains.map((gain) => (
          <motion.div
            key={gain.id}
            initial={{ opacity: 0, y: 14, scale: 0.8 }}
            animate={{ opacity: 1, y: gain.burst ? -38 : -26, scale: gain.burst ? 1.12 : 1 }}
            exit={{ opacity: 0, y: gain.burst ? -50 : -36 }}
            className={cn("vt-floating-gain", gain.burst && "is-burst")}
            style={{ left: `${gain.left}%`, top: `${gain.top}%` }}
          >
            <span>+{gain.value}</span>
          </motion.div>
        ))}

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onPointerDown={handleTap}
          className={cn("vt-main-coin", tapAnimating && "is-active")}
        >
          <span className="vt-main-coin-inner">
            <span className="vt-main-avatar-head" aria-hidden="true">
              <span className="vt-main-avatar-eye" />
              <span className="vt-main-avatar-eye" />
            </span>
            <span className="vt-main-avatar-body">VT</span>
          </span>
          <span className="vt-main-coin-ring" />
          <span className="vt-main-coin-hint">{isRtl ? "اضغط بسرعة لرفع الكومبو" : "Tap quickly to raise combo"}</span>
        </motion.button>

        <div className="vt-tap-footer">
          <div className={cn("vt-sync-pill", isSyncingTaps && "is-live")}>
            <span className={cn("vt-live-dot", isSyncingTaps && "is-on")} />
            {isRtl ? "مباشر" : "Live"}
          </div>
          <Button
            size="sm"
            className="min-w-32"
            disabled={turboCooldownSeconds > 0 || user.energy <= 0}
            onClick={handleTurboTap}
          >
            {turboCooldownSeconds > 0
              ? `${isRtl ? "توربو" : "Turbo"} (${turboCooldownSeconds}s)`
              : `${isRtl ? "توربو" : "Turbo"} x${TURBO_TAP_SIZE}`}
          </Button>
        </div>
      </div>
    </section>
  );

  const upgradesScreen = (
    <Card className="vt-panel-card">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp size={18} className="text-amber-300" />
          {isRtl ? "مركز الترقيات" : "Upgrade Center"}
        </CardTitle>
        <div className="vt-filter-row">
          {upgradeCategories.map((category) => (
            <button
              key={category}
              type="button"
              className={cn("vt-filter-chip", upgradeFilter === category && "is-active")}
              onClick={() => setUpgradeFilter(category)}
            >
              {category === "all" ? (isRtl ? "الكل" : "All") : category.toUpperCase()}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredUpgrades.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-secondary/25 p-4 text-center text-sm">
            {isRtl ? "لا توجد ترقيات في هذا القسم حالياً." : "No upgrades in this filter yet."}
          </div>
        ) : null}

        {filteredUpgrades.map((upgrade, index) => {
          const maxed = upgrade.nextCost === null;
          const cost = upgrade.nextCost ?? 0;
          const canBuyNow = !maxed && canAfford(cost, user.points);
          const lockedByLevel = playerLevel < upgrade.unlockLevel;
          const levelPercent = Math.min(100, Math.round((upgrade.currentLevel / upgrade.maxLevel) * 100));
          return (
            <motion.div
              key={upgrade.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: index * 0.06,
                ease: [0.22, 1, 0.36, 1]
              }}
              whileHover={{ y: -2 }}
              className="vt-upgrade-card"
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70",
                  categoryStyle(upgrade.category)
                )}
              />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="vt-upgrade-thumb">
                      {upgrade.imageUrl ? (
                        <img src={upgrade.imageUrl} alt={upgrade.titleEn} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl">{upgrade.icon || "⚡"}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold leading-tight">{isRtl ? upgrade.titleAr : upgrade.titleEn}</h4>
                      <p className="mt-1 text-[11px] text-slate-300">{upgrade.category.toUpperCase()}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {isRtl ? "مستوى" : "Lvl"} {upgrade.currentLevel}/{upgrade.maxLevel}
                  </Badge>
                </div>

                <p className="mt-2 text-xs text-slate-300/85">{isRtl ? upgrade.descriptionAr : upgrade.descriptionEn}</p>
                <Progress value={levelPercent} className="mt-3 h-2.5" />

                <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
                  <BoostTag label={isRtl ? "النقر" : "Tap"} value={upgrade.tapBoost} />
                  <BoostTag label="PPH" value={upgrade.pphBoost} />
                  <BoostTag label={isRtl ? "الطاقة" : "Energy"} value={upgrade.energyBoost} />
                  <BoostTag label={isRtl ? "تلقائي" : "Auto"} value={upgrade.autoTapBoost} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    disabled={!canBuyNow || lockedByLevel || maxed}
                    onClick={() => void handleBuyUpgrade(upgrade.id)}
                  >
                    {maxed
                      ? isRtl
                        ? "مكتملة"
                        : "Max"
                      : lockedByLevel
                        ? `${isRtl ? "يتطلب مستوى" : "Need Lvl"} ${upgrade.unlockLevel}`
                        : `${isRtl ? "ترقية" : "Upgrade"} ${formatNumber(cost)}`}
                  </Button>

                  {upgrade.starsPrice ? (
                    <Button size="sm" variant="outline" onClick={() => handleStarsUpgrade(upgrade)}>
                      <Star size={13} className="me-1" />
                      {isRtl ? `نجوم ${upgrade.starsPrice}` : `Stars ${upgrade.starsPrice}`}
                    </Button>
                  ) : (
                    <div className="rounded-lg border border-border/40 bg-secondary/30 px-2 py-1 text-center text-xs text-slate-400">
                      {isRtl ? "لا يوجد عرض نجوم" : "No stars offer"}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );

  const tasksScreen = (
    <Card className="vt-panel-card">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecks size={18} className="text-cyan-300" />
          {t("tasks.title")}
        </CardTitle>
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: "all" as TaskFilter, ar: "الكل", en: "All" },
            { key: "DAILY" as TaskFilter, ar: "يومي", en: "Daily" },
            { key: "SOCIAL" as TaskFilter, ar: "اجتماعي", en: "Social" },
            { key: "CIPHER" as TaskFilter, ar: "Cipher", en: "Cipher" }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className={cn("vt-filter-chip h-8", taskFilter === item.key && "is-active")}
              onClick={() => setTaskFilter(item.key)}
            >
              {isRtl ? item.ar : item.en}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={15} className="text-primary" />
            Daily Cipher
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={t("tasks.cipherPlaceholder")}
              value={cipherInput}
              onChange={(event) => setCipherInput(event.target.value)}
            />
            <Button
              variant="outline"
              onClick={() =>
                setCipherInput(
                  `VT-${new Date().toISOString().slice(8, 10)}${new Date().toISOString().slice(5, 7)}-CIPHER`
                )
              }
            >
              Hint
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("tasks.dailyCipherHint")}</p>
        </div>

        <div className="space-y-2">
          {filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.05,
                ease: [0.22, 1, 0.36, 1]
              }}
              className="vt-task-row"
            >
              <div>
                <div className="font-semibold">{isRtl ? task.titleAr : task.titleEn}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{task.type}</Badge>
                  <span>+{formatNumber(task.reward)}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant={task.isClaimed ? "secondary" : "default"}
                disabled={task.isClaimed}
                onClick={() => void handleClaimTask(task)}
              >
                {task.isClaimed ? t("tasks.claimed") : t("tasks.claim")}
              </Button>
            </motion.div>
          ))}
          {filteredTasks.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-secondary/25 px-3 py-4 text-center text-xs text-slate-300">
              {isRtl ? "لا توجد مهام ضمن هذا القسم حالياً." : "No tasks in this section right now."}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  const friendsScreen = (
    <Card className="vt-panel-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users size={18} className="text-violet-300" />
          {t("referrals.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t("referrals.level1"), value: String(referralStats?.level1Count ?? referral?.directReferrals ?? 0), index: 0 },
            { label: t("referrals.level2"), value: String(referralStats?.level2Count ?? 0), index: 1 },
            { label: t("referrals.estimatedRewards"), value: formatNumber(referralStats?.estimatedRewards ?? 0), index: 2 }
          ].map(({ label, value, index }) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: [0.22, 1, 0.36, 1]
              }}
            >
              <Metric label={label} value={value} />
            </motion.div>
          ))}
        </div>

        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
          <div className="text-xs text-slate-300">{t("referrals.code")}</div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-bold tracking-widest">{referral?.referralCode}</span>
            <Button size="sm" variant="outline" onClick={copyReferralCode}>
              {isRtl ? "نسخ الكود" : "Copy code"}
            </Button>
          </div>
          <div className="mt-3 rounded-lg border border-border/60 bg-card/40 p-2 text-[11px] text-slate-300">
            {isRtl ? "مكافأة الدعوة: 1000 نقطة لك + 1000 لصديقك." : "Invite reward: 1000 for you + 1000 for your friend."}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button size="sm" onClick={shareReferralLink}>
              {isRtl ? "مشاركة رابط الدعوة" : "Share invite"}
            </Button>
            <Button size="sm" variant="secondary" onClick={copyReferralLink}>
              {isRtl ? "نسخ الرابط" : "Copy link"}
            </Button>
          </div>
          <p className="mt-2 truncate text-xs text-slate-300/80">{referralLink || (isRtl ? "رابط الدعوة غير مفعّل بعد." : "Invite link not configured yet.")}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/45 p-3">
          <p className="mb-2 text-sm font-semibold">{isRtl ? "كيف تعمل الدعوة؟" : "How referral works"}</p>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="rounded-lg bg-secondary/25 px-2 py-1.5">
              1. {isRtl ? "انسخ رابط الدعوة وأرسله لصديقك." : "Copy your invite link and send it."}
            </div>
            <div className="rounded-lg bg-secondary/25 px-2 py-1.5">
              2. {isRtl ? "الصديق يفتح البوت من نفس الرابط." : "Friend opens the bot using your link."}
            </div>
            <div className="rounded-lg bg-secondary/25 px-2 py-1.5">
              3. {isRtl ? "يُضاف 1000 نقطة لكل طرف تلقائيًا." : "Both sides get 1000 points automatically."}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/45 p-3">
          <p className="mb-2 text-sm font-semibold">{isRtl ? "أفضل الأصدقاء" : "Top Friends"}</p>
          <div className="space-y-1">
            {(referralStats?.referrals ?? []).slice(0, 10).map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: isRtl ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.03,
                  ease: [0.22, 1, 0.36, 1]
                }}
                className="flex items-center justify-between rounded-lg bg-secondary/25 px-2 py-1.5 text-sm"
              >
                <span>{item.name}</span>
                <span className="font-semibold">{formatNumber(item.points)}</span>
              </motion.div>
            ))}
            {(referralStats?.referrals?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground">{isRtl ? "لا توجد بيانات حالياً." : "No data yet."}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const leaderboardScreen = (
    <Card className="vt-panel-card">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy size={18} className="text-yellow-300" />
          {t("leaderboard.title")}
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={leaderboardType === "global" ? "default" : "outline"}
            onClick={() => setLeaderboardType("global")}
          >
            {t("leaderboard.global")}
          </Button>
          <Button
            size="sm"
            variant={leaderboardType === "weekly" ? "default" : "outline"}
            onClick={() => setLeaderboardType("weekly")}
          >
            {t("leaderboard.weekly")}
          </Button>
          <Button
            size="sm"
            variant={leaderboardType === "friends" ? "default" : "outline"}
            onClick={() => setLeaderboardType("friends")}
          >
            {t("leaderboard.friends")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {topThreeLeaders.map((item, index) => (
            <motion.div
              key={`top-${item.id}`}
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1]
              }}
              className={cn(
                "rounded-xl border p-2 text-center",
                item.rank === 1
                  ? "border-yellow-300/70 bg-yellow-500/15"
                  : item.rank === 2
                    ? "border-slate-300/60 bg-slate-500/10"
                    : "border-orange-300/60 bg-orange-500/10"
              )}
            >
              <div className="text-lg">{rankMark(item.rank)}</div>
              <p className="truncate text-xs font-bold">{item.name}</p>
              <p className="text-xs text-slate-200">{formatNumber(item.points)}</p>
            </motion.div>
          ))}
        </div>

        {restLeaders.map((item, index) => (
          <motion.div
            key={`${item.id}-${item.rank}`}
            initial={{ opacity: 0, x: isRtl ? -16 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.4,
              delay: index * 0.04,
              ease: [0.22, 1, 0.36, 1]
            }}
            className={cn(
              "flex items-center justify-between rounded-xl border border-border/60 p-3",
              item.rank <= 3 && "bg-amber-500/10"
            )}
          >
            <div className="flex items-center gap-3">
              <Badge>{item.rank}</Badge>
              <span className="font-semibold">{item.name}</span>
            </div>
            <span className="font-bold">{formatNumber(item.points)}</span>
          </motion.div>
        ))}
        {leaderboard.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-secondary/25 px-3 py-4 text-center text-xs text-slate-300">
            {isRtl ? "لا توجد بيانات صدارة حالياً." : "No leaderboard data yet."}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const settingsScreen = (
    <Card className="vt-panel-card vt-settings-card">
      <CardContent className="space-y-3 p-4">
        <SettingTile
          icon={<Globe size={16} />}
          title={isRtl ? "اللغة" : "Language"}
          description={isRtl ? "تغيير لغة الواجهة" : "Switch interface language"}
        >
          <select
            className="h-9 w-full rounded-lg border border-border bg-background/90 px-3 text-sm"
            value={i18n.language}
            onChange={(event) => void i18n.changeLanguage(event.target.value)}
          >
            {SUPPORTED_LANGS.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </SettingTile>

        <SettingTile
          icon={<Wallet size={16} />}
          title={isRtl ? "المحفظة" : "Wallet"}
          description={isRtl ? "ربط TON وطلب الأيردروب" : "Connect TON and request airdrop"}
        >
          <div className="space-y-2">
            <Suspense
              fallback={
                <div className="h-11 w-full rounded-lg border border-border/60 bg-secondary/30 text-center text-xs leading-[44px] text-slate-300">
                  {isRtl ? "تحميل المحفظة..." : "Loading wallet..."}
                </div>
              }
            >
              <TonWalletConnectLazy className="!w-full" manifestUrl={tonManifestUrl} />
            </Suspense>
            <Input
              placeholder={t("wallet.placeholder")}
              value={walletAddress}
              onChange={(event) => setWalletAddress(event.target.value)}
            />
            <Button className="w-full" onClick={() => void handleClaimAirdrop()}>
              {t("wallet.claim")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("wallet.estimated")}: {formatNumber(Number(user.points) / 1000)}
            </p>
          </div>
        </SettingTile>

        <SettingTile
          icon={<Bot size={16} />}
          title={isRtl ? "الحساب" : "Account"}
          description={isRtl ? "بيانات الملف والاتصال" : "Profile and connection status"}
        >
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label={isRtl ? "الاسم" : "Name"} value={displayName} icon={<Crown size={14} />} />
            <MiniStat
              label={isRtl ? "الاتصال" : "Status"}
              value={t("common.connected")}
              icon={<Sparkles size={14} />}
            />
            <MiniStat
              label={isRtl ? "النقاط" : "Points"}
              value={formatNumber(user.points)}
              icon={<Coins size={14} />}
            />
            <MiniStat
              label={isRtl ? "نجوم مصروفة" : "Stars spent"}
              value={formatNumber(user.starsSpent)}
              icon={<Star size={14} />}
            />
          </div>
        </SettingTile>

        <div className="rounded-xl border border-amber-300/35 bg-amber-500/10 p-3 text-xs text-amber-100">
          {isRtl
            ? "الشراء بالنجوم يتم من داخل التطبيق مباشرة من بطاقة الترقية."
            : "Stars purchases are handled directly inside this mini app from upgrade cards."}
        </div>
      </CardContent>
    </Card>
  );

  const currentScreen =
    activeTab === "home"
      ? homeScreen
      : activeTab === "upgrades"
        ? upgradesScreen
        : activeTab === "tasks"
          ? tasksScreen
          : activeTab === "friends"
            ? friendsScreen
            : leaderboardScreen;

  return (
    <div className="vt-shell">
      <div className="vt-backdrop-grid pointer-events-none absolute inset-0 -z-10" />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          custom={tabDirection}
          initial={{ opacity: 0, x: tabDirection > 0 ? 24 : -24, scale: 0.992 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: tabDirection > 0 ? -18 : 18, scale: 0.992 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="vt-screen"
        >
          {currentScreen}
        </motion.div>
      </AnimatePresence>

      <nav className="vt-bottom-nav">
        <div className="vt-bottom-nav-row">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.key;
            const label = isRtl ? item.labelAr : item.labelEn;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className={cn("vt-bottom-nav-item", active && "is-active")}
                onClick={() => handleTabChange(item.key)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <div className="vt-bottom-nav-track">
          <motion.span
            className="vt-bottom-nav-indicator"
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.38 }}
            style={{
              width: `calc((100% - 16px) / ${NAV_ITEMS.length})`,
              transform: `translateX(calc(${navActiveIndex} * 100%))`
            }}
          />
        </div>
      </nav>

      <AnimatePresence>
        {settingsOpen ? (
          <>
            <motion.button
              type="button"
              className="vt-settings-overlay"
              aria-label="close settings"
              onClick={() => setSettingsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 36 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="vt-settings-modal"
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-sm font-semibold text-slate-200">
                  {isRtl ? "الإعدادات والتحكم" : "Settings & Control"}
                </p>
                <button
                  type="button"
                  className="vt-icon-btn h-8 w-8"
                  onClick={() => setSettingsOpen(false)}
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
              {settingsScreen}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/35 p-2.5">
      <div className="mb-1 flex items-center gap-1 text-[11px] text-slate-300/90">
        {icon}
        <span>{label}</span>
      </div>
      <div className="truncate text-sm font-bold">{value}</div>
    </div>
  );
}

function StatBox({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="vt-stat-box">
      <div className="vt-stat-head">
        {icon}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}

function BoostTag({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/35 px-2 py-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>{" "}
      <span className="font-semibold">+{value}</span>
    </div>
  );
}

function SettingTile({
  icon,
  title,
  description,
  children
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/20 text-primary">{icon}</span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

