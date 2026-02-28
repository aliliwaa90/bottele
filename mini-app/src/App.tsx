import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Flame,
  Gift,
  Globe,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Wallet,
  Zap
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { TonConnectButton } from "@tonconnect/ui-react";
import { toast } from "sonner";
import WebApp from "@twa-dev/sdk";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import {
  getTelegramInitData,
  getTelegramUser,
  initTelegram,
  isTelegramWebApp
} from "@/lib/telegram";
import { cn, formatNumber } from "@/lib/utils";
import type { LeaderboardItem, Task, Upgrade, User } from "@/types/api";

const RTL_LANGS = new Set(["ar", "fa"]);
const SUPPORTED_LANGS = ["ar", "en", "ru", "tr", "es", "fa", "id"] as const;
type BoardType = "global" | "weekly" | "friends";

type FloatingGain = { id: number; value: number; left: number; top: number };
type ReferralStats = {
  level1Count: number;
  level2Count: number;
  estimatedRewards: number;
  referrals: Array<{ id: string; name: string; points: string }>;
};

const TAP_FLUSH_DELAY_MS = 120;
const TURBO_TAP_SIZE = 10;
const TURBO_COOLDOWN_MS = 4500;

function playTapSound() {
  const AudioContextClass =
    window.AudioContext ||
    ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null);
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = 420;
  gain.gain.setValueAtTime(0.11, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.1);
}

function rankMark(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

export default function App() {
  const { t, i18n } = useTranslation();
  const socketEnabled = import.meta.env.VITE_DISABLE_SOCKET !== "true";

  const [loading, setLoading] = useState(true);
  const [outsideTelegram, setOutsideTelegram] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<BoardType>("global");
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
  const [pendingTapsDisplay, setPendingTapsDisplay] = useState(0);
  const [isSyncingTaps, setIsSyncingTaps] = useState(false);

  const userRef = useRef<User | null>(null);
  const pendingTapsRef = useRef(0);
  const flushingTapsRef = useRef(false);
  const tapFlushTimerRef = useRef<number | null>(null);

  const energyPercent = useMemo(() => {
    if (!user || user.maxEnergy === 0) return 0;
    return Math.round((user.energy / user.maxEnergy) * 100);
  }, [user]);
  const turboCooldownSeconds = useMemo(() => {
    const diff = Math.max(0, turboCooldownUntil - nowTick);
    return Math.ceil(diff / 1000);
  }, [turboCooldownUntil, nowTick]);

  const isRtl = RTL_LANGS.has(i18n.language);
  const displayName =
    user?.firstName?.trim() ||
    user?.username?.trim() ||
    `${t("leaderboard.player")} #${String(user?.telegramId ?? "").slice(-4) || "0000"}`;

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  async function refreshBaseData(currentBoardType: BoardType) {
    const [gameState, taskState, board, referrals] = await Promise.all([
      api.gameMe(),
      api.getTasks(),
      api.leaderboard(currentBoardType),
      api.referrals()
    ]);
    setUser(gameState.user);
    setUpgrades(gameState.upgrades);
    setReferral(gameState.referral);
    setActiveEvents(gameState.activeEvents);
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

        await refreshBaseData(leaderboardType);

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
    const interval = window.setInterval(() => setNowTick(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [i18n.language, isRtl]);

  const addFloatingGain = (value: number) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const gain = {
      id,
      value,
      left: 42 + Math.random() * 24,
      top: 40 + Math.random() * 16
    };
    setFloatingGains((prev) => [...prev, gain]);
    window.setTimeout(() => {
      setFloatingGains((prev) => prev.filter((item) => item.id !== id));
    }, 900);
  };

  const addToNumericString = (value: string, increment: number) => {
    if (increment <= 0) return value;
    try {
      return (BigInt(value) + BigInt(increment)).toString();
    } catch {
      return String((Number(value) || 0) + increment);
    }
  };

  const activeEventMultiplier = () =>
    activeEvents.reduce((highest, event) => Math.max(highest, event.multiplier), 1);

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
    try {
      while (pendingTapsRef.current > 0) {
        const batch = Math.min(30, pendingTapsRef.current);
        pendingTapsRef.current -= batch;
        setPendingTapsDisplay(pendingTapsRef.current);
        const response = await api.tap(batch);
        userRef.current = response.user;
        setUser(response.user);
      }
    } catch (error) {
      pendingTapsRef.current = 0;
      setPendingTapsDisplay(0);
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
      setIsSyncingTaps(false);
      if (pendingTapsRef.current > 0) {
        scheduleTapFlush(40);
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
    setPendingTapsDisplay(pendingTapsRef.current);
    if (pendingTapsRef.current >= 8) {
      void flushTapQueue();
    } else {
      scheduleTapFlush();
    }
    return realTaps;
  };

  const handleTap = () => {
    const accepted = queueTaps(1);
    if (accepted === 0) {
      toast.warning(t("tap.energyLow"));
      return;
    }

    setTapAnimating(true);
    playTapSound();
    try {
      WebApp.HapticFeedback.impactOccurred("light");
    } catch {
      // Ignore haptic issues outside Telegram clients.
    }
    setTimeout(() => setTapAnimating(false), 180);
  };

  const handleTurboTap = () => {
    const now = Date.now();
    if (now < turboCooldownUntil) {
      toast.warning(isRtl ? `انتظر ${turboCooldownSeconds} ثانية` : `Wait ${turboCooldownSeconds}s`);
      return;
    }

    const accepted = queueTaps(TURBO_TAP_SIZE);
    if (accepted === 0) {
      toast.warning(t("tap.energyLow"));
      return;
    }

    setTurboCooldownUntil(now + TURBO_COOLDOWN_MS);
    setTapAnimating(true);
    playTapSound();
    try {
      WebApp.HapticFeedback.impactOccurred("medium");
    } catch {
      // Ignore haptic issues outside Telegram clients.
    }
    setTimeout(() => setTapAnimating(false), 220);
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

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
        <Card className="w-full max-w-md border-primary/30 bg-card/85">
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
                ? "هذه الواجهة تعمل من داخل Telegram فقط لحماية حساب اللاعبين."
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

  return (
    <div className="mx-auto max-w-6xl px-3 pb-10 pt-4 md:px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="overflow-hidden border-primary/20 bg-[linear-gradient(120deg,rgba(8,24,59,.95),rgba(13,26,49,.85)_55%,rgba(41,21,11,.75))]">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Crown size={18} className="text-primary" />
                  <h1 className="text-2xl font-black">{t("app.title")}</h1>
                </div>
                <p className="text-sm text-muted-foreground">{t("app.subtitle")}</p>
                <p className="text-xs text-amber-200/85">
                  {isRtl ? `أهلاً ${displayName}` : `Welcome ${displayName}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Sparkles size={12} />
                  {t("common.connected")}
                </Badge>
                <div className="relative">
                  <Globe size={13} className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 opacity-70" />
                  <select
                    className="h-9 rounded-lg border border-border bg-background/90 px-8 text-sm"
                    value={i18n.language}
                    onChange={(event) => void i18n.changeLanguage(event.target.value)}
                  >
                    {SUPPORTED_LANGS.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <StatCard label={t("stats.points")} value={formatNumber(user.points)} icon={<Sparkles size={14} />} />
              <StatCard label={t("stats.energy")} value={`${user.energy}/${user.maxEnergy}`} icon={<Zap size={14} />} />
              <StatCard label={t("stats.combo")} value={`${user.comboMultiplier.toFixed(2)}x`} icon={<Flame size={14} />} />
              <StatCard label={t("stats.pph")} value={formatNumber(user.pph)} icon={<Gift size={14} />} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("stats.energy")}</span>
                <span>{energyPercent}%</span>
              </div>
              <Progress value={energyPercent} className="h-2.5" />
            </div>
            {activeEvents.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeEvents.map((event) => (
                  <Badge key={event.id} className="bg-amber-500/80 text-slate-900">
                    {t("events.activeBooster")}:{" "}
                    {(i18n.language === "ar" ? event.nameAr : event.nameEn) || event.nameAr} x{event.multiplier}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardHeader>
        </Card>

        <Tabs defaultValue="tap">
          <TabsList className="grid grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="tap">{t("tabs.tap")}</TabsTrigger>
            <TabsTrigger value="upgrades">{t("tabs.upgrades")}</TabsTrigger>
            <TabsTrigger value="tasks">{t("tabs.tasks")}</TabsTrigger>
            <TabsTrigger value="referrals">{t("tabs.referrals")}</TabsTrigger>
            <TabsTrigger value="leaderboard">{t("tabs.leaderboard")}</TabsTrigger>
            <TabsTrigger value="wallet">{t("tabs.wallet")}</TabsTrigger>
          </TabsList>

          <TabsContent value="tap">
            <Card className="overflow-hidden">
              <CardContent className="relative p-5 md:p-7">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(251,191,36,0.2),transparent_48%)]" />
                {floatingGains.map((gain) => (
                  <motion.div
                    key={gain.id}
                    initial={{ opacity: 1, y: 0, scale: 0.9 }}
                    animate={{ opacity: 0, y: -55, scale: 1.1 }}
                    transition={{ duration: 0.85 }}
                    className="pointer-events-none absolute z-20 text-sm font-bold text-yellow-300"
                    style={{ left: `${gain.left}%`, top: `${gain.top}%` }}
                  >
                    +{gain.value}
                  </motion.div>
                ))}
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleTap}
                    className={cn(
                      "group relative grid h-56 w-56 place-items-center rounded-full border-4 border-amber-100/70 bg-[linear-gradient(145deg,#fcd34d,#f59e0b,#ea580c)] shadow-[0_20px_80px_rgba(249,115,22,0.45)] md:h-64 md:w-64",
                      tapAnimating && "animate-pulseTap"
                    )}
                  >
                    <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.72),transparent_38%)]" />
                    <span className="absolute -inset-2 rounded-full border border-amber-200/45 opacity-70 blur-[2px]" />
                    <span className="relative text-7xl drop-shadow-sm">🪙</span>
                  </motion.button>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-amber-100">
                      +{user.tapPower} / tap | {t("stats.combo")}: {user.comboMultiplier.toFixed(2)}x
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{t("tap.tapNow")}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={turboCooldownSeconds > 0 || user.energy <= 0}
                      onClick={handleTurboTap}
                    >
                      {turboCooldownSeconds > 0
                        ? `⚡ Turbo (${turboCooldownSeconds}s)`
                        : "⚡ Turbo x10"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pendingTapsDisplay === 0 || isSyncingTaps}
                      onClick={() => void flushTapQueue()}
                    >
                      {isSyncingTaps
                        ? isRtl
                          ? "جارٍ المزامنة..."
                          : "Syncing..."
                        : isRtl
                          ? "مزامنة الآن"
                          : "Sync now"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isRtl
                      ? `نقرات قيد الإرسال: ${pendingTapsDisplay}`
                      : `Pending taps: ${pendingTapsDisplay}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upgrades">
            <Card>
              <CardHeader>
                <CardTitle>{t("upgrades.title")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {upgrades.map((upgrade) => {
                  const maxed = upgrade.nextCost === null;
                  const cost = upgrade.nextCost ?? 0;
                  const canBuy = !maxed && Number(user.points) >= cost;
                  const levelPercent = Math.min(100, Math.round((upgrade.currentLevel / upgrade.maxLevel) * 100));
                  return (
                    <div key={upgrade.id} className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold">{i18n.language === "ar" ? upgrade.titleAr : upgrade.titleEn}</h4>
                          <p className="text-xs text-muted-foreground">
                            {i18n.language === "ar" ? upgrade.descriptionAr : upgrade.descriptionEn}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {t("upgrades.level")} {upgrade.currentLevel}/{upgrade.maxLevel}
                        </Badge>
                      </div>
                      <Progress value={levelPercent} className="mt-3 h-2" />
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {upgrade.tapBoost > 0 ? (
                          <Badge variant="outline">
                            +{upgrade.tapBoost} {t("upgrades.boostTap")}
                          </Badge>
                        ) : null}
                        {upgrade.pphBoost > 0 ? (
                          <Badge variant="outline">
                            +{upgrade.pphBoost} {t("upgrades.boostPph")}
                          </Badge>
                        ) : null}
                        {upgrade.energyBoost > 0 ? (
                          <Badge variant="outline">
                            +{upgrade.energyBoost} {t("upgrades.boostEnergy")}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {maxed ? t("upgrades.max") : `${t("upgrades.cost")}: ${formatNumber(cost)}`}
                        </span>
                        <Button size="sm" disabled={!canBuy} onClick={() => void handleBuyUpgrade(upgrade.id)}>
                          {t("upgrades.buy")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>{t("tasks.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Target size={15} className="text-primary" />
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
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/55 p-3"
                    >
                      <div>
                        <div className="font-semibold">{i18n.language === "ar" ? task.titleAr : task.titleEn}</div>
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={16} />
                  {t("referrals.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-secondary/20 p-3">
                  <span className="text-sm text-muted-foreground">{t("referrals.code")}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tracking-wide">{referral?.referralCode}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(referral?.referralCode ?? "");
                        toast.success("Copied");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <Metric
                    label={t("referrals.level1")}
                    value={String(referralStats?.level1Count ?? referral?.directReferrals ?? 0)}
                  />
                  <Metric label={t("referrals.level2")} value={String(referralStats?.level2Count ?? 0)} />
                  <Metric
                    label={t("referrals.estimatedRewards")}
                    value={formatNumber(referralStats?.estimatedRewards ?? 0)}
                  />
                </div>
                <div className="rounded-xl border border-border/60 bg-card/45 p-3">
                  <p className="mb-2 text-sm font-semibold">{isRtl ? "أفضل المحالين" : "Top referrals"}</p>
                  <div className="space-y-1">
                    {(referralStats?.referrals ?? []).slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-secondary/25 px-2 py-1.5 text-sm">
                        <span>{item.name}</span>
                        <span className="font-semibold">{formatNumber(item.points)}</span>
                      </div>
                    ))}
                    {(referralStats?.referrals?.length ?? 0) === 0 ? (
                      <p className="text-xs text-muted-foreground">{isRtl ? "لا توجد بيانات حالياً." : "No data yet."}</p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2">
                  <Trophy size={17} />
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
              <CardContent className="space-y-2">
                {leaderboard.map((item) => (
                  <div
                    key={`${item.id}-${item.rank}`}
                    className={cn(
                      "flex items-center justify-between rounded-xl border border-border/60 p-3",
                      item.rank <= 3 && "bg-amber-500/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Badge>{rankMark(item.rank)}</Badge>
                      <span className="font-semibold">{item.name}</span>
                    </div>
                    <span className="font-bold">{formatNumber(item.points)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet size={17} />
                  {t("wallet.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TonConnectButton className="!w-full" />
                <div className="space-y-2 rounded-xl border border-border/60 bg-secondary/20 p-3">
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/35 p-3">
      <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
