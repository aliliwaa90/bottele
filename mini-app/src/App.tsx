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

// ─── Constants ────────────────────────────────────────────────────────────────

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
  { key: "home",        labelAr: "الرئيسية", labelEn: "Home",    icon: Home },
  { key: "upgrades",   labelAr: "المتجر",   labelEn: "Store",   icon: TrendingUp },
  { key: "tasks",      labelAr: "المهام",   labelEn: "Tasks",   icon: ListChecks },
  { key: "friends",    labelAr: "الأصدقاء", labelEn: "Friends", icon: Users },
  { key: "leaderboard",labelAr: "الصدارة",  labelEn: "Top",     icon: Trophy }
];

const TAP_FLUSH_DELAY_MS             = 18;
const TURBO_TAP_SIZE                 = 10;
const TURBO_COOLDOWN_MS              = 4500;
const TAP_FLUSH_BATCH                = 400;
const TAP_FLUSH_IMMEDIATE_THRESHOLD  = 6;
const ENERGY_WARNING_COOLDOWN_MS     = 900;

// ─── Lazy TON Wallet ──────────────────────────────────────────────────────────

type TonWalletConnectProps = { className?: string; manifestUrl: string };

const TonWalletConnectLazy = lazy(async () => {
  const module = await import("@tonconnect/ui-react");
  const Component = ({ className, manifestUrl }: TonWalletConnectProps) => (
    <module.TonConnectUIProvider manifestUrl={manifestUrl}>
      <module.TonConnectButton className={className} />
    </module.TonConnectUIProvider>
  );
  return { default: Component };
});

// ─── Audio ────────────────────────────────────────────────────────────────────

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
  if (context.state === "suspended") void context.resume().catch(() => undefined);
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rankMark(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

function categoryGradient(category: string): string {
  switch (category) {
    case "tap":       return "from-orange-500/30 via-amber-500/15 to-transparent";
    case "pph":       return "from-cyan-500/30 via-blue-500/15 to-transparent";
    case "energy":    return "from-emerald-500/30 via-green-500/15 to-transparent";
    case "autotap":   return "from-violet-500/30 via-fuchsia-500/15 to-transparent";
    case "legendary": return "from-yellow-400/35 via-orange-500/20 to-transparent";
    default:          return "from-slate-500/20 via-slate-500/10 to-transparent";
  }
}

function categoryAccent(category: string): string {
  switch (category) {
    case "tap":       return "border-orange-400/40";
    case "pph":       return "border-cyan-400/40";
    case "energy":    return "border-emerald-400/40";
    case "autotap":   return "border-violet-400/40";
    case "legendary": return "border-yellow-400/50";
    default:          return "border-slate-500/30";
  }
}

function numericFromString(input: string): number {
  try {
    const value = BigInt(input);
    const max   = BigInt(Number.MAX_SAFE_INTEGER);
    if (value > max) return Number.MAX_SAFE_INTEGER;
    return Number(value);
  } catch {
    return Number(input) || 0;
  }
}

function addToNumericString(value: string, increment: number) {
  if (increment <= 0) return value;
  try { return (BigInt(value) + BigInt(increment)).toString(); }
  catch { return String((Number(value) || 0) + increment); }
}

function formatFullNumber(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.floor(num));
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function App() {
  const { t, i18n } = useTranslation();
  const tonManifestUrl = import.meta.env.VITE_TON_MANIFEST_URL ?? "https://bottele-mini-app.vercel.app/tonconnect-manifest.json";
  const socketEnabled  = import.meta.env.VITE_DISABLE_SOCKET !== "true";
  const botUsername    = (import.meta.env.VITE_BOT_USERNAME ?? import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? "").toString().replace("@", "").trim();

  const [loading,          setLoading]          = useState(true);
  const [outsideTelegram,  setOutsideTelegram]  = useState(false);
  const [user,             setUser]             = useState<User | null>(null);
  const [upgrades,         setUpgrades]         = useState<Upgrade[]>([]);
  const [tasks,            setTasks]            = useState<Task[]>([]);
  const [leaderboard,      setLeaderboard]      = useState<LeaderboardItem[]>([]);
  const [activeTab,        setActiveTab]        = useState<ActiveTab>("home");
  const [tabDirection,     setTabDirection]     = useState(1);
  const [leaderboardType,  setLeaderboardType]  = useState<BoardType>("global");
  const [upgradeFilter,    setUpgradeFilter]    = useState("all");
  const [taskFilter,       setTaskFilter]       = useState<TaskFilter>("all");
  const [referral,         setReferral]         = useState<{ directReferrals: number; referralCode: string } | null>(null);
  const [referralStats,    setReferralStats]    = useState<ReferralStats | null>(null);
  const [activeEvents,     setActiveEvents]     = useState<Array<{ id: string; nameAr: string; nameEn: string; multiplier: number }>>([]);
  const [cipherInput,      setCipherInput]      = useState("");
  const [walletAddress,    setWalletAddress]    = useState("");
  const [tapAnimating,     setTapAnimating]     = useState(false);
  const [floatingGains,    setFloatingGains]    = useState<FloatingGain[]>([]);
  const [turboCooldownUntil, setTurboCooldownUntil] = useState(0);
  const [nowTick,          setNowTick]          = useState(() => Date.now());
  const [isSyncingTaps,    setIsSyncingTaps]    = useState(false);
  const [settingsOpen,     setSettingsOpen]     = useState(false);

  const userRef               = useRef<User | null>(null);
  const pendingTapsRef        = useRef(0);
  const flushingTapsRef       = useRef(false);
  const tapFlushTimerRef      = useRef<number | null>(null);
  const lastSoundAtRef        = useRef(0);
  const lastEnergyWarningAtRef = useRef(0);

  const isRtl = RTL_LANGS.has(i18n.language);
  const displayName =
    user?.firstName?.trim() ||
    user?.username?.trim() ||
    `${t("leaderboard.player")} #${String(user?.telegramId ?? "").slice(-4) || "0000"}`;

  const referralLink = useMemo(() => {
    const code = referral?.referralCode?.trim();
    if (!code || !botUsername) return "";
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
    return Math.min(105, Math.max(1, Math.floor(Math.pow(pointsNumber + 400, 0.17))));
  }, [pointsNumber, user]);

  const levelProgress = useMemo(() => {
    if (!user || playerLevel >= 105) return 100;
    const prevNeed = Math.floor(Math.pow(playerLevel + 2, 3) * 120);
    const nextNeed = Math.floor(Math.pow(playerLevel + 3, 3) * 120);
    const current  = pointsNumber;
    if (current <= prevNeed) return 0;
    return Math.min(100, Math.max(0, Math.round(((current - prevNeed) / Math.max(1, nextNeed - prevNeed)) * 100)));
  }, [playerLevel, pointsNumber, user]);

  const upgradeCategories = useMemo(
    () => ["all", ...Array.from(new Set(upgrades.map((u) => u.category)))],
    [upgrades]
  );

  const filteredUpgrades = useMemo(
    () => upgrades
      .filter((u) => upgradeFilter === "all" || u.category === upgradeFilter)
      .slice()
      .sort((a, b) => a.unlockLevel - b.unlockLevel || a.baseCost - b.baseCost),
    [upgrades, upgradeFilter]
  );

  const filteredTasks       = useMemo(() => tasks.filter((t) => taskFilter === "all" || t.type === taskFilter), [tasks, taskFilter]);
  const topThreeLeaders     = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const restLeaders         = useMemo(() => leaderboard.slice(3), [leaderboard]);
  const navActiveIndex      = useMemo(() => Math.max(0, NAV_ITEMS.findIndex((i) => i.key === activeTab)), [activeTab]);

  const handleTabChange = (nextTab: ActiveTab) => {
    if (nextTab === activeTab) return;
    const nextIndex = NAV_ITEMS.findIndex((i) => i.key === nextTab);
    setTabDirection(nextIndex > navActiveIndex ? 1 : -1);
    setActiveTab(nextTab);
  };

  useEffect(() => { userRef.current = user; }, [user]);

  async function refreshFastData() {
    const gs = await api.gameMe();
    setUser(gs.user); setUpgrades(gs.upgrades); setReferral(gs.referral); setActiveEvents(gs.activeEvents);
  }

  async function refreshSecondaryData(board: BoardType) {
    const [taskState, lb, referrals] = await Promise.all([api.getTasks(), api.leaderboard(board), api.referrals()]);
    setTasks(taskState.tasks); setLeaderboard(lb); setReferralStats(referrals);
  }

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        initTelegram();
        const inTelegram   = isTelegramWebApp();
        const params       = new URLSearchParams(window.location.search);
        const allowExternal = params.get("dev") === "1";
        if (!inTelegram && !allowExternal) { setOutsideTelegram(true); setLoading(false); return; }

        const tgUser       = getTelegramUser();
        const tgInitData   = getTelegramInitData();
        const fallbackId   = localStorage.getItem("vaulttap-local-id") ?? String(Date.now()).slice(-10);
        localStorage.setItem("vaulttap-local-id", fallbackId);
        const referralCode = params.get("startapp") || params.get("ref") || undefined;

        const login = await api.login({
          telegramId:   tgUser?.id ?? fallbackId,
          username:     tgUser?.username,
          firstName:    tgUser?.first_name,
          lastName:     tgUser?.last_name,
          language:     tgUser?.language_code ?? "ar",
          referralCode,
          initData:     tgInitData ?? undefined
        });

        api.setToken(login.token);

        if (socketEnabled) {
          const socket = connectSocket(login.token);
          socket.on("user:update", (payload: User) => { if (mounted) setUser(payload); });
          socket.on("leaderboard:update", (payload: LeaderboardItem[]) => { if (mounted && leaderboardType === "global") setLeaderboard(payload); });
          socket.on("mass:notification", (payload: { title: string; body: string }) => toast.info(payload.title, { description: payload.body }));
        }

        await refreshFastData();
        if (mounted) setLoading(false);
        void refreshSecondaryData(leaderboardType).catch(() => undefined);

        if (SUPPORTED_LANGS.includes(login.user.language as (typeof SUPPORTED_LANGS)[number]))
          await i18n.changeLanguage(login.user.language);
        else await i18n.changeLanguage("ar");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("common.error"));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void init();
    return () => {
      mounted = false;
      if (socketEnabled) disconnectSocket();
      if (tapFlushTimerRef.current !== null) { window.clearTimeout(tapFlushTimerRef.current); tapFlushTimerRef.current = null; }
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
    document.documentElement.dir  = isRtl ? "rtl" : "ltr";
  }, [i18n.language, isRtl]);

  const activeEventMultiplier = () => activeEvents.reduce((h, e) => Math.max(h, e.multiplier), 1);

  const addFloatingGain = (value: number, burst = false) => {
    const id   = Date.now() + Math.floor(Math.random() * 1000);
    const gain = { id, value, left: 46 + Math.random() * 12, top: 41 + Math.random() * 14, burst };
    setFloatingGains((prev) => [...prev.slice(-7), gain]);
    window.setTimeout(() => setFloatingGains((prev) => prev.filter((i) => i.id !== id)), burst ? 1050 : 820);
  };

  const scheduleTapFlush = (delay = TAP_FLUSH_DELAY_MS) => {
    if (tapFlushTimerRef.current !== null) return;
    tapFlushTimerRef.current = window.setTimeout(() => { tapFlushTimerRef.current = null; void flushTapQueue(); }, delay);
  };

  const flushTapQueue = async () => {
    if (flushingTapsRef.current || pendingTapsRef.current <= 0) return;
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
      try { const s = await api.gameMe(); userRef.current = s.user; setUser(s.user); setUpgrades(s.upgrades); setReferral(s.referral); setActiveEvents(s.activeEvents); } catch {}
    } finally {
      flushingTapsRef.current = false;
      if (pendingTapsRef.current > 0) scheduleTapFlush(10);
      else setIsSyncingTaps(false);
    }
  };

  const queueTaps = (requestedTaps: number): number => {
    const cu = userRef.current;
    if (!cu || cu.energy <= 0 || requestedTaps <= 0) return 0;
    const realTaps      = Math.min(requestedTaps, cu.energy);
    const estimatedGain = Math.max(1, Math.floor(cu.tapPower * cu.comboMultiplier * activeEventMultiplier())) * realTaps;
    const nextUser: User = { ...cu, energy: Math.max(0, cu.energy - realTaps), points: addToNumericString(cu.points, estimatedGain), totalTaps: addToNumericString(cu.totalTaps, realTaps) };
    userRef.current = nextUser;
    setUser(nextUser);
    addFloatingGain(estimatedGain);
    pendingTapsRef.current += realTaps;
    if (pendingTapsRef.current >= TAP_FLUSH_IMMEDIATE_THRESHOLD) void flushTapQueue();
    else scheduleTapFlush();
    return realTaps;
  };

  const handleTap = () => {
    const accepted = queueTaps(1);
    if (accepted === 0) {
      const now = Date.now();
      if (now - lastEnergyWarningAtRef.current >= ENERGY_WARNING_COOLDOWN_MS) { toast.warning(t("tap.energyLow")); lastEnergyWarningAtRef.current = now; }
      return;
    }
    setTapAnimating(true);
    const now = Date.now();
    if (now - lastSoundAtRef.current > 42) { playTapSound(); lastSoundAtRef.current = now; }
    try { WebApp.HapticFeedback.impactOccurred("light"); } catch {}
    setTimeout(() => setTapAnimating(false), 120);
  };

  const handleTurboTap = () => {
    const now = Date.now();
    if (now < turboCooldownUntil) { toast.warning(isRtl ? `انتظر ${turboCooldownSeconds} ثانية` : `Wait ${turboCooldownSeconds}s`); return; }
    const accepted = queueTaps(TURBO_TAP_SIZE);
    if (accepted === 0) {
      if (now - lastEnergyWarningAtRef.current >= ENERGY_WARNING_COOLDOWN_MS) { toast.warning(t("tap.energyLow")); lastEnergyWarningAtRef.current = now; }
      return;
    }
    const snap = userRef.current;
    if (snap) addFloatingGain(Math.max(1, Math.floor(TURBO_TAP_SIZE * snap.tapPower * snap.comboMultiplier * activeEventMultiplier())), true);
    setTurboCooldownUntil(now + TURBO_COOLDOWN_MS);
    setTapAnimating(true);
    playTapSound();
    try { WebApp.HapticFeedback.impactOccurred("medium"); } catch {}
    setTimeout(() => setTapAnimating(false), 180);
  };

  const handleBuyUpgrade = async (upgradeId: string) => {
    try {
      await flushTapQueue();
      const result = await api.buyUpgrade(upgradeId);
      setUser(result.user); userRef.current = result.user;
      const gs = await api.gameMe(); setUpgrades(gs.upgrades);
      toast.success(result.message);
    } catch (error) { toast.error(error instanceof Error ? error.message : t("common.error")); }
  };

  const handleStarsUpgrade = async (upgrade: Upgrade) => {
    if (!upgrade.starsPrice || upgrade.starsPrice <= 0) { toast.warning(isRtl ? "هذه الترقية لا تدعم النجوم" : "This upgrade is not available for Stars."); return; }
    try {
      await flushTapQueue();
      const invoice = await api.createStarsInvoice(upgrade.key);
      const status  = await openTelegramInvoice(invoice.invoiceLink);
      if (status === "paid") { toast.success(isRtl ? "تم الدفع بالنجوم بنجاح." : "Stars payment completed."); await refreshFastData(); return; }
      if (status === "cancelled") { toast.info(isRtl ? "تم إلغاء الدفع." : "Payment cancelled."); return; }
      if (status === "failed")    { toast.error(isRtl ? "فشل الدفع." : "Payment failed. Try again."); return; }
      if (status === "unsupported") { window.open(invoice.invoiceLink, "_blank", "noopener,noreferrer"); toast.info(isRtl ? "أكمل الدفع داخل تيليجرام." : "Complete payment in Telegram."); }
    } catch (error) { toast.error(error instanceof Error ? error.message : t("common.error")); }
  };

  const handleClaimTask = async (task: Task) => {
    try {
      await flushTapQueue();
      const result = await api.claimTask(task.id, task.type === "CIPHER" ? cipherInput : undefined);
      toast.success(`${result.message} +${result.reward}`);
      const [taskState, gs] = await Promise.all([api.getTasks(), api.gameMe()]);
      setTasks(taskState.tasks); setUser(gs.user); userRef.current = gs.user; setCipherInput("");
    } catch (error) { toast.error(error instanceof Error ? error.message : t("common.error")); }
  };

  const handleClaimAirdrop = async () => {
    if (!walletAddress.trim()) { toast.warning(t("wallet.placeholder")); return; }
    try {
      await flushTapQueue();
      const result = await api.claimAirdrop(walletAddress.trim());
      toast.success(`${t("wallet.claim")} ${formatNumber(result.estimatedJetton)}`);
      setWalletAddress(result.walletAddress);
    } catch (error) { toast.error(error instanceof Error ? error.message : t("common.error")); }
  };

  const copyReferralCode = () => navigator.clipboard.writeText(referral?.referralCode ?? "").then(() => toast.success(isRtl ? "تم النسخ" : "Copied")).catch(() => toast.error(isRtl ? "تعذر النسخ" : "Failed to copy"));

  const copyReferralLink = () => {
    if (!referralLink) { toast.warning(isRtl ? "أضف VITE_BOT_USERNAME" : "Set VITE_BOT_USERNAME to enable invite links."); return; }
    navigator.clipboard.writeText(referralLink).then(() => toast.success(isRtl ? "تم نسخ رابط الدعوة" : "Invite link copied")).catch(() => toast.error(isRtl ? "تعذر نسخ الرابط" : "Failed to copy invite link"));
  };

  const shareReferralLink = () => {
    if (!referralLink) { toast.warning(isRtl ? "أضف VITE_BOT_USERNAME" : "Set VITE_BOT_USERNAME to enable invite links."); return; }
    const text     = isRtl ? "انضم إلى VaultTap من هذا الرابط وخذ مكافأة 1000 نقطة:" : "Join VaultTap using this link and get 1000 points:";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    try { if (isTelegramWebApp()) WebApp.openTelegramLink(shareUrl); else window.open(shareUrl, "_blank", "noopener,noreferrer"); }
    catch { window.open(shareUrl, "_blank", "noopener,noreferrer"); }
  };

  const canAfford = (cost: number, points: string): boolean => {
    try { return BigInt(points) >= BigInt(cost); }
    catch { return Number(points) >= cost; }
  };

  // ─── Loading / Guards ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="vt-shell vt-loading-shell">
        <div className="vt-loader-orb">
          <motion.div
            className="vt-loader-ring"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          />
          <span className="vt-loader-logo">VT</span>
        </div>
        <p className="vt-loader-text">{t("common.loading")}</p>
      </div>
    );
  }

  if (outsideTelegram) {
    return (
      <div className="vt-shell vt-guard-shell">
        <motion.div className="vt-guard-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="vt-guard-icon"><ShieldCheck size={28} /></div>
          <h2 className="vt-guard-title">VaultTap</h2>
          <p className="vt-guard-body">{isRtl ? "هذه الواجهة تعمل من داخل Telegram فقط لحماية حسابات اللاعبين." : "This interface works only inside Telegram to protect player accounts."}</p>
          <p className="vt-guard-hint">{isRtl ? "افتح البوت ثم اضغط على زر فتح VaultTap Mini App." : "Open the bot and tap the Open VaultTap Mini App button."}</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="vt-shell vt-guard-shell">
        <div className="vt-guard-card"><p className="text-center text-slate-300">{t("common.error")}</p></div>
      </div>
    );
  }

  // ─── Screens ─────────────────────────────────────────────────────────────────

  const homeScreen = (
    <section className="vt-home-screen">
      {/* Header */}
      <header className="vt-home-header">
        <div className="vt-brand">
          <span className="vt-brand-badge">VT</span>
          <div>
            <p className="vt-brand-name">VaultTap</p>
            <p className="vt-brand-tagline">{isRtl ? "نسخة جديدة كلياً" : "Full new experience"}</p>
          </div>
        </div>
        <div className="vt-header-actions">
          <motion.button whileTap={{ scale: 0.9 }} type="button" className="vt-icon-btn" onClick={() => setSettingsOpen(true)}>
            <Settings size={17} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} type="button" className="vt-icon-btn vt-icon-btn--trophy" onClick={() => handleTabChange("leaderboard")}>
            <Trophy size={17} />
          </motion.button>
        </div>
      </header>

      {/* Player Card */}
      <div className="vt-player-card">
        <div className="vt-player-avatar">{(displayName[0] ?? "?").toUpperCase()}</div>
        <div className="vt-player-info">
          <p className="vt-player-name">{displayName}</p>
          <p className="vt-player-level">
            <Crown size={11} className="inline me-1 text-amber-400" />
            {isRtl ? "المستوى" : "Level"} {playerLevel}<span className="text-slate-500">/105</span>
          </p>
        </div>
        <div className="vt-online-dot" />
      </div>

      {/* Active Events */}
      {activeEvents.length > 0 && (
        <motion.div className="vt-event-banner" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <Sparkles size={13} className="shrink-0 text-amber-300" />
          <span>
            {isRtl ? "حدث نشط" : "Live Event"}:{" "}
            {activeEvents.slice(0, 2).map((e) => `${isRtl ? e.nameAr : e.nameEn} ×${e.multiplier}`).join(" • ")}
          </span>
        </motion.div>
      )}

      {/* Balance */}
      <div className="vt-balance-card">
        <p className="vt-balance-amount">{formatFullNumber(user.points)}</p>
        <p className="vt-balance-label">{isRtl ? "إجمالي النقاط" : "Total Points"}</p>
        <div className="vt-progress-wrap">
          <div className="vt-progress-labels">
            <span>{isRtl ? "تقدم المستوى" : "Level Progress"}</span>
            <span className="vt-progress-pct">{levelProgress}%</span>
          </div>
          <div className="vt-progress-track">
            <motion.div
              className="vt-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="vt-stats-grid">
        <StatBox label={t("stats.energy")}  value={`${user.energy}/${user.maxEnergy}`} icon={<Zap size={13} />}   color="amber" />
        <StatBox label={t("stats.combo")}   value={`${user.comboMultiplier.toFixed(2)}×`} icon={<Crown size={13} />} color="violet" />
        <StatBox label="PPH"                value={formatNumber(user.pph)}           icon={<Coins size={13} />} color="cyan" />
      </div>

      {/* Energy Bar */}
      <div className="vt-energy-bar">
        <div className="vt-energy-labels">
          <span className="flex items-center gap-1"><Zap size={11} className="text-amber-400" />{isRtl ? "الطاقة" : "Energy"}</span>
          <span className="vt-energy-pct">{energyPercent}%</span>
        </div>
        <div className="vt-progress-track">
          <motion.div
            className="vt-progress-fill vt-progress-fill--energy"
            initial={{ width: 0 }}
            animate={{ width: `${energyPercent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Tap Zone */}
      <div className="vt-tap-zone">
        {floatingGains.map((gain) => (
          <motion.div
            key={gain.id}
            initial={{ opacity: 0, y: 10, scale: 0.7 }}
            animate={{ opacity: 1, y: gain.burst ? -46 : -30, scale: gain.burst ? 1.15 : 1 }}
            exit={{ opacity: 0, y: gain.burst ? -62 : -42 }}
            className={cn("vt-floating-gain", gain.burst && "is-burst")}
            style={{ left: `${gain.left}%`, top: `${gain.top}%` }}
          >
            +{formatNumber(gain.value)}
          </motion.div>
        ))}

        <motion.button
          whileTap={{ scale: 0.93 }}
          type="button"
          onPointerDown={handleTap}
          className={cn("vt-coin-btn", tapAnimating && "is-tapping")}
        >
          <div className="vt-coin-glow" />
          <div className="vt-coin-face">
            <span className="vt-coin-eyes">
              <span className="vt-coin-eye" />
              <span className="vt-coin-eye" />
            </span>
            <span className="vt-coin-label">VT</span>
          </div>
          <div className="vt-coin-ring vt-coin-ring--1" />
          <div className="vt-coin-ring vt-coin-ring--2" />
        </motion.button>

        <p className="vt-tap-hint">{isRtl ? "اضغط بسرعة لرفع الكومبو" : "Tap quickly to raise combo"}</p>

        <div className="vt-tap-controls">
          <div className={cn("vt-sync-badge", isSyncingTaps && "is-live")}>
            <span className={cn("vt-pulse-dot", isSyncingTaps && "is-on")} />
            {isRtl ? "مباشر" : "Live"}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            className={cn("vt-turbo-btn", turboCooldownSeconds > 0 || user.energy <= 0 ? "is-disabled" : "")}
            disabled={turboCooldownSeconds > 0 || user.energy <= 0}
            onClick={handleTurboTap}
          >
            <Zap size={14} />
            {turboCooldownSeconds > 0
              ? `${isRtl ? "توربو" : "Turbo"} (${turboCooldownSeconds}s)`
              : `${isRtl ? "توربو" : "Turbo"} ×${TURBO_TAP_SIZE}`}
          </motion.button>
        </div>
      </div>
    </section>
  );

  const upgradesScreen = (
    <div className="vt-panel">
      <div className="vt-panel-header">
        <TrendingUp size={17} className="text-amber-400" />
        <h2 className="vt-panel-title">{isRtl ? "مركز الترقيات" : "Upgrade Center"}</h2>
      </div>

      <div className="vt-filter-bar">
        {upgradeCategories.map((cat) => (
          <button key={cat} type="button" className={cn("vt-chip", upgradeFilter === cat && "is-active")} onClick={() => setUpgradeFilter(cat)}>
            {cat === "all" ? (isRtl ? "الكل" : "All") : cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="vt-card-list">
        {filteredUpgrades.length === 0 && (
          <div className="vt-empty">{isRtl ? "لا توجد ترقيات في هذا القسم حالياً." : "No upgrades in this filter yet."}</div>
        )}
        {filteredUpgrades.map((upgrade) => {
          const maxed        = upgrade.nextCost === null;
          const cost         = upgrade.nextCost ?? 0;
          const canBuyNow    = !maxed && canAfford(cost, user.points);
          const lockedByLevel = playerLevel < upgrade.unlockLevel;
          const levelPercent = Math.min(100, Math.round((upgrade.currentLevel / upgrade.maxLevel) * 100));
          return (
            <motion.div
              key={upgrade.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("vt-upgrade-card", categoryAccent(upgrade.category))}
            >
              <div className={cn("vt-upgrade-card-bg bg-gradient-to-br", categoryGradient(upgrade.category))} />
              <div className="vt-upgrade-content">
                <div className="vt-upgrade-top">
                  <div className="vt-upgrade-thumb">
                    {upgrade.imageUrl
                      ? <img src={upgrade.imageUrl} alt={upgrade.titleEn} className="h-full w-full object-cover rounded-xl" />
                      : <span className="text-2xl">{upgrade.icon || "⚡"}</span>}
                  </div>
                  <div className="vt-upgrade-meta">
                    <h4 className="vt-upgrade-name">{isRtl ? upgrade.titleAr : upgrade.titleEn}</h4>
                    <span className="vt-upgrade-cat">{upgrade.category.toUpperCase()}</span>
                  </div>
                  <span className="vt-upgrade-lvl-badge">{isRtl ? "مستوى" : "Lvl"} {upgrade.currentLevel}/{upgrade.maxLevel}</span>
                </div>

                <p className="vt-upgrade-desc">{isRtl ? upgrade.descriptionAr : upgrade.descriptionEn}</p>

                <div className="vt-progress-track vt-progress-track--sm mt-2">
                  <motion.div className="vt-progress-fill" initial={{ width: 0 }} animate={{ width: `${levelPercent}%` }} transition={{ duration: 0.6 }} />
                </div>

                <div className="vt-boost-grid">
                  <BoostTag label={isRtl ? "النقر" : "Tap"} value={upgrade.tapBoost} />
                  <BoostTag label="PPH" value={upgrade.pphBoost} />
                  <BoostTag label={isRtl ? "الطاقة" : "Energy"} value={upgrade.energyBoost} />
                  <BoostTag label={isRtl ? "تلقائي" : "Auto"} value={upgrade.autoTapBoost} />
                </div>

                <div className="vt-upgrade-actions">
                  <button
                    type="button"
                    className={cn("vt-action-btn vt-action-btn--primary", (!canBuyNow || lockedByLevel || maxed) && "is-disabled")}
                    disabled={!canBuyNow || lockedByLevel || maxed}
                    onClick={() => void handleBuyUpgrade(upgrade.id)}
                  >
                    {maxed ? (isRtl ? "مكتملة ✓" : "Maxed ✓")
                      : lockedByLevel ? `🔒 ${isRtl ? "يتطلب مستوى" : "Need Lvl"} ${upgrade.unlockLevel}`
                      : `${isRtl ? "ترقية" : "Upgrade"} — ${formatNumber(cost)}`}
                  </button>
                  {upgrade.starsPrice ? (
                    <button type="button" className="vt-action-btn vt-action-btn--stars" onClick={() => handleStarsUpgrade(upgrade)}>
                      <Star size={12} className="me-1" />
                      {upgrade.starsPrice} {isRtl ? "نجوم" : "Stars"}
                    </button>
                  ) : (
                    <div className="vt-no-stars">{isRtl ? "لا يوجد عرض نجوم" : "No stars offer"}</div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const tasksScreen = (
    <div className="vt-panel">
      <div className="vt-panel-header">
        <ListChecks size={17} className="text-cyan-400" />
        <h2 className="vt-panel-title">{t("tasks.title")}</h2>
      </div>

      <div className="vt-filter-bar">
        {([{ key: "all", ar: "الكل", en: "All" }, { key: "DAILY", ar: "يومي", en: "Daily" }, { key: "SOCIAL", ar: "اجتماعي", en: "Social" }, { key: "CIPHER", ar: "Cipher", en: "Cipher" }] as const).map((item) => (
          <button key={item.key} type="button" className={cn("vt-chip", taskFilter === item.key && "is-active")} onClick={() => setTaskFilter(item.key)}>
            {isRtl ? item.ar : item.en}
          </button>
        ))}
      </div>

      <div className="vt-cipher-box">
        <div className="vt-cipher-header">
          <Sparkles size={14} className="text-amber-300" />
          <span>Daily Cipher</span>
        </div>
        <div className="vt-cipher-row">
          <input
            className="vt-input"
            placeholder={t("tasks.cipherPlaceholder")}
            value={cipherInput}
            onChange={(e) => setCipherInput(e.target.value)}
          />
          <button
            type="button"
            className="vt-action-btn vt-action-btn--outline"
            onClick={() => setCipherInput(`VT-${new Date().toISOString().slice(8, 10)}${new Date().toISOString().slice(5, 7)}-CIPHER`)}
          >
            Hint
          </button>
        </div>
        <p className="vt-cipher-hint">{t("tasks.dailyCipherHint")}</p>
      </div>

      <div className="vt-task-list">
        {filteredTasks.map((task) => (
          <motion.div key={task.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className={cn("vt-task-row", task.isClaimed && "is-claimed")}>
            <div className="vt-task-info">
              <p className="vt-task-name">{isRtl ? task.titleAr : task.titleEn}</p>
              <div className="vt-task-meta">
                <span className="vt-type-badge">{task.type}</span>
                <span className="vt-task-reward">+{formatNumber(task.reward)}</span>
              </div>
            </div>
            <button
              type="button"
              className={cn("vt-action-btn vt-action-btn--sm", task.isClaimed ? "is-claimed" : "vt-action-btn--primary")}
              disabled={task.isClaimed}
              onClick={() => void handleClaimTask(task)}
            >
              {task.isClaimed ? "✓" : t("tasks.claim")}
            </button>
          </motion.div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="vt-empty">{isRtl ? "لا توجد مهام ضمن هذا القسم حالياً." : "No tasks in this section right now."}</div>
        )}
      </div>
    </div>
  );

  const friendsScreen = (
    <div className="vt-panel">
      <div className="vt-panel-header">
        <Users size={17} className="text-violet-400" />
        <h2 className="vt-panel-title">{t("referrals.title")}</h2>
      </div>

      <div className="vt-metrics-row">
        <MetricBox label={t("referrals.level1")} value={String(referralStats?.level1Count ?? referral?.directReferrals ?? 0)} icon="👥" />
        <MetricBox label={t("referrals.level2")} value={String(referralStats?.level2Count ?? 0)} icon="🌐" />
        <MetricBox label={t("referrals.estimatedRewards")} value={formatNumber(referralStats?.estimatedRewards ?? 0)} icon="🪙" />
      </div>

      <div className="vt-referral-box">
        <p className="vt-section-label">{t("referrals.code")}</p>
        <div className="vt-code-row">
          <span className="vt-code-value">{referral?.referralCode}</span>
          <button type="button" className="vt-action-btn vt-action-btn--outline vt-action-btn--sm" onClick={copyReferralCode}>
            {isRtl ? "نسخ" : "Copy"}
          </button>
        </div>
        <p className="vt-referral-note">{isRtl ? "مكافأة الدعوة: 1000 نقطة لك + 1000 لصديقك." : "Invite reward: 1000 for you + 1000 for your friend."}</p>
        <div className="vt-referral-actions">
          <button type="button" className="vt-action-btn vt-action-btn--primary" onClick={shareReferralLink}>
            {isRtl ? "مشاركة" : "Share Invite"}
          </button>
          <button type="button" className="vt-action-btn vt-action-btn--outline" onClick={copyReferralLink}>
            {isRtl ? "نسخ الرابط" : "Copy Link"}
          </button>
        </div>
        <p className="vt-link-preview">{referralLink || (isRtl ? "رابط الدعوة غير مفعّل بعد." : "Invite link not configured yet.")}</p>
      </div>

      <div className="vt-how-works">
        <p className="vt-section-label">{isRtl ? "كيف تعمل الدعوة؟" : "How It Works"}</p>
        {[
          isRtl ? "انسخ رابط الدعوة وأرسله لصديقك." : "Copy your invite link and send it.",
          isRtl ? "الصديق يفتح البوت من نفس الرابط." : "Friend opens the bot using your link.",
          isRtl ? "يُضاف 1000 نقطة لكل طرف تلقائيًا." : "Both sides get 1000 points automatically."
        ].map((step, i) => (
          <div key={i} className="vt-step-row">
            <span className="vt-step-num">{i + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      <div className="vt-top-friends">
        <p className="vt-section-label">{isRtl ? "أفضل الأصدقاء" : "Top Friends"}</p>
        {(referralStats?.referrals ?? []).slice(0, 10).map((item) => (
          <div key={item.id} className="vt-friend-row">
            <span>{item.name}</span>
            <span className="vt-friend-pts">{formatNumber(item.points)}</span>
          </div>
        ))}
        {(referralStats?.referrals?.length ?? 0) === 0 && (
          <p className="vt-empty">{isRtl ? "لا توجد بيانات حالياً." : "No data yet."}</p>
        )}
      </div>
    </div>
  );

  const leaderboardScreen = (
    <div className="vt-panel">
      <div className="vt-panel-header">
        <Trophy size={17} className="text-yellow-400" />
        <h2 className="vt-panel-title">{t("leaderboard.title")}</h2>
      </div>

      <div className="vt-filter-bar">
        {(["global", "weekly", "friends"] as BoardType[]).map((type) => (
          <button key={type} type="button" className={cn("vt-chip", leaderboardType === type && "is-active")} onClick={() => setLeaderboardType(type)}>
            {t(`leaderboard.${type}`)}
          </button>
        ))}
      </div>

      {topThreeLeaders.length > 0 && (
        <div className="vt-podium">
          {topThreeLeaders.map((item) => (
            <div key={`top-${item.id}`} className={cn("vt-podium-item", item.rank === 1 && "is-first", item.rank === 2 && "is-second", item.rank === 3 && "is-third")}>
              <div className="vt-podium-medal">{rankMark(item.rank)}</div>
              <p className="vt-podium-name">{item.name}</p>
              <p className="vt-podium-pts">{formatNumber(item.points)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="vt-lb-list">
        {restLeaders.map((item) => (
          <div key={`${item.id}-${item.rank}`} className={cn("vt-lb-row", item.rank <= 3 && "is-top")}>
            <div className="vt-lb-rank">#{item.rank}</div>
            <span className="vt-lb-name">{item.name}</span>
            <span className="vt-lb-pts">{formatNumber(item.points)}</span>
          </div>
        ))}
        {leaderboard.length === 0 && <div className="vt-empty">{isRtl ? "لا توجد بيانات صدارة حالياً." : "No leaderboard data yet."}</div>}
      </div>
    </div>
  );

  const settingsScreen = (
    <div className="vt-settings-body">
      <SettingSection icon={<Globe size={15} />} title={isRtl ? "اللغة" : "Language"} desc={isRtl ? "تغيير لغة الواجهة" : "Switch interface language"}>
        <select className="vt-select" value={i18n.language} onChange={(e) => void i18n.changeLanguage(e.target.value)}>
          {SUPPORTED_LANGS.map((lang) => <option key={lang} value={lang}>{lang.toUpperCase()}</option>)}
        </select>
      </SettingSection>

      <SettingSection icon={<Wallet size={15} />} title={isRtl ? "المحفظة" : "Wallet"} desc={isRtl ? "ربط TON وطلب الأيردروب" : "Connect TON & request airdrop"}>
        <div className="space-y-2">
          <Suspense fallback={<div className="vt-wallet-loading">{isRtl ? "تحميل..." : "Loading..."}</div>}>
            <TonWalletConnectLazy className="!w-full" manifestUrl={tonManifestUrl} />
          </Suspense>
          <input className="vt-input" placeholder={t("wallet.placeholder")} value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} />
          <button type="button" className="vt-action-btn vt-action-btn--primary w-full" onClick={() => void handleClaimAirdrop()}>
            {t("wallet.claim")}
          </button>
          <p className="text-xs text-slate-400">{t("wallet.estimated")}: {formatNumber(Number(user.points) / 1000)}</p>
        </div>
      </SettingSection>

      <SettingSection icon={<Bot size={15} />} title={isRtl ? "الحساب" : "Account"} desc={isRtl ? "بيانات الملف والاتصال" : "Profile & connection status"}>
        <div className="vt-mini-stats">
          <MiniStat label={isRtl ? "الاسم" : "Name"}         value={displayName}            icon={<Crown size={12} />} />
          <MiniStat label={isRtl ? "الاتصال" : "Status"}     value={t("common.connected")}  icon={<Sparkles size={12} />} />
          <MiniStat label={isRtl ? "النقاط" : "Points"}      value={formatNumber(user.points)} icon={<Coins size={12} />} />
          <MiniStat label={isRtl ? "نجوم مصروفة" : "Stars"} value={formatNumber(user.starsSpent)} icon={<Star size={12} />} />
        </div>
      </SettingSection>

      <div className="vt-info-box">
        {isRtl ? "الشراء بالنجوم يتم من داخل التطبيق مباشرة من بطاقة الترقية." : "Stars purchases are handled directly from upgrade cards inside the mini app."}
      </div>
    </div>
  );

  const currentScreen =
    activeTab === "home"        ? homeScreen :
    activeTab === "upgrades"    ? upgradesScreen :
    activeTab === "tasks"       ? tasksScreen :
    activeTab === "friends"     ? friendsScreen :
                                  leaderboardScreen;

  // ─── Layout ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Injected styles */}
      <style>{vtStyles}</style>

      <div className="vt-shell">
        {/* Animated background */}
        <div className="vt-bg" aria-hidden="true">
          <div className="vt-bg-orb vt-bg-orb--1" />
          <div className="vt-bg-orb vt-bg-orb--2" />
          <div className="vt-bg-orb vt-bg-orb--3" />
          <div className="vt-bg-grid" />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            custom={tabDirection}
            initial={{ opacity: 0, x: tabDirection > 0 ? 28 : -28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tabDirection > 0 ? -20 : 20 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="vt-screen-wrap"
          >
            {currentScreen}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Nav */}
        <nav className="vt-nav">
          <div className="vt-nav-track">
            <motion.div
              className="vt-nav-indicator"
              layout
              transition={{ type: "spring", stiffness: 400, damping: 34, mass: 0.35 }}
              style={{ width: `${100 / NAV_ITEMS.length}%`, left: `${(navActiveIndex * 100) / NAV_ITEMS.length}%` }}
            />
          </div>
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.key;
            const Icon = item.icon;
            return (
              <button key={item.key} type="button" className={cn("vt-nav-item", active && "is-active")} onClick={() => handleTabChange(item.key)}>
                <Icon size={18} />
                <span>{isRtl ? item.labelAr : item.labelEn}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Drawer */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.button
              type="button"
              aria-label="close settings"
              className="vt-overlay"
              onClick={() => setSettingsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="vt-drawer"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 32 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="vt-drawer-handle" />
              <div className="vt-drawer-head">
                <p className="vt-drawer-title">{isRtl ? "الإعدادات والتحكم" : "Settings & Control"}</p>
                <button type="button" className="vt-close-btn" onClick={() => setSettingsOpen(false)}>×</button>
              </div>
              {settingsScreen}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBox({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: "amber" | "violet" | "cyan" }) {
  const colorMap = { amber: "text-amber-400 bg-amber-400/10", violet: "text-violet-400 bg-violet-400/10", cyan: "text-cyan-400 bg-cyan-400/10" };
  return (
    <div className="vt-stat-box">
      <div className={cn("vt-stat-icon", colorMap[color])}>{icon}</div>
      <p className="vt-stat-label">{label}</p>
      <p className="vt-stat-value">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="vt-mini-stat">
      <div className="vt-mini-stat-head">{icon}<span>{label}</span></div>
      <p className="vt-mini-stat-val">{value}</p>
    </div>
  );
}

function MetricBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="vt-metric-box">
      <span className="vt-metric-icon">{icon}</span>
      <p className="vt-metric-value">{value}</p>
      <p className="vt-metric-label">{label}</p>
    </div>
  );
}

function BoostTag({ label, value }: { label: string; value: number }) {
  return (
    <div className="vt-boost-tag">
      <span className="vt-boost-label">{label}</span>
      <span className="vt-boost-value">+{value}</span>
    </div>
  );
}

function SettingSection({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="vt-setting-section">
      <div className="vt-setting-header">
        <span className="vt-setting-icon">{icon}</span>
        <div>
          <p className="vt-setting-title">{title}</p>
          <p className="vt-setting-desc">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const vtStyles = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

:root {
  --bg:       #07080f;
  --surface:  #0d0f1c;
  --card:     #111424;
  --card2:    #161929;
  --border:   rgba(255,255,255,0.07);
  --border2:  rgba(255,255,255,0.11);
  --text:     #e8eaf2;
  --muted:    #6b7280;
  --gold:     #f5c842;
  --gold-dim: rgba(245,200,66,0.15);
  --violet:   #8b5cf6;
  --cyan:     #22d3ee;
  --amber:    #fbbf24;
  --green:    #4ade80;
  --radius:   14px;
  --radius-sm:8px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Space Grotesk', sans-serif;
  background: var(--bg);
  color: var(--text);
  overflow-x: hidden;
  -webkit-tap-highlight-color: transparent;
}

/* Shell */
.vt-shell {
  position: relative;
  max-width: 430px;
  margin: 0 auto;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Background */
.vt-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.vt-bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.18;
}
.vt-bg-orb--1 { width: 320px; height: 320px; background: #7c3aed; top: -80px; left: -60px; animation: orbFloat1 14s ease-in-out infinite; }
.vt-bg-orb--2 { width: 240px; height: 240px; background: #0891b2; bottom: 100px; right: -50px; animation: orbFloat2 18s ease-in-out infinite; }
.vt-bg-orb--3 { width: 180px; height: 180px; background: #f59e0b; top: 50%; left: 50%; transform: translate(-50%,-50%); animation: orbFloat3 22s ease-in-out infinite; }
@keyframes orbFloat1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,30px)} }
@keyframes orbFloat2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-18px,-22px)} }
@keyframes orbFloat3 { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.15)} }

.vt-bg-grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Loading */
.vt-loading-shell, .vt-guard-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  gap: 16px;
}
.vt-loader-orb {
  position: relative;
  width: 72px; height: 72px;
  display: flex; align-items: center; justify-content: center;
}
.vt-loader-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: var(--gold);
  border-right-color: var(--violet);
}
.vt-loader-logo {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 18px;
  color: var(--gold);
}
.vt-loader-text { font-size: 14px; color: var(--muted); }

/* Guard Card */
.vt-guard-card {
  background: var(--card);
  border: 1px solid var(--border2);
  border-radius: 20px;
  padding: 28px 24px;
  max-width: 340px;
  width: 90%;
  text-align: center;
}
.vt-guard-icon {
  width: 56px; height: 56px;
  background: rgba(245,200,66,0.12);
  border: 1px solid rgba(245,200,66,0.3);
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 14px;
  color: var(--gold);
}
.vt-guard-title { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
.vt-guard-body  { font-size: 14px; color: var(--muted); margin-bottom: 8px; }
.vt-guard-hint  { font-size: 12px; color: rgba(107,114,128,0.7); }

/* Screen Wrap */
.vt-screen-wrap {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 14px 90px;
  scrollbar-width: none;
}
.vt-screen-wrap::-webkit-scrollbar { display: none; }

/* ── Home Screen ── */
.vt-home-screen { display: flex; flex-direction: column; gap: 12px; }

.vt-home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.vt-brand { display: flex; align-items: center; gap: 10px; }
.vt-brand-badge {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 13px;
  width: 36px; height: 36px;
  background: linear-gradient(135deg, var(--gold), #f97316);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #0a0b10;
}
.vt-brand-name { font-size: 17px; font-weight: 700; letter-spacing: -0.3px; }
.vt-brand-tagline { font-size: 11px; color: var(--muted); }
.vt-header-actions { display: flex; gap: 8px; }

/* Icon Buttons */
.vt-icon-btn {
  width: 36px; height: 36px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--muted);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.vt-icon-btn:hover { border-color: var(--border2); color: var(--text); }
.vt-icon-btn--trophy { color: var(--gold); border-color: rgba(245,200,66,0.25); background: rgba(245,200,66,0.08); }

/* Player Card */
.vt-player-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
}
.vt-player-avatar {
  width: 42px; height: 42px;
  background: linear-gradient(135deg, var(--violet), #ec4899);
  border-radius: 12px;
  font-weight: 700; font-size: 17px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.vt-player-info { flex: 1; min-width: 0; }
.vt-player-name  { font-size: 15px; font-weight: 600; truncate: ellipsis; overflow: hidden; white-space: nowrap; }
.vt-player-level { font-size: 12px; color: var(--muted); margin-top: 2px; }
.vt-online-dot {
  width: 9px; height: 9px;
  background: var(--green);
  border-radius: 50%;
  box-shadow: 0 0 6px var(--green);
  flex-shrink: 0;
}

/* Event Banner */
.vt-event-banner {
  display: flex;
  align-items: center;
  gap: 7px;
  background: linear-gradient(135deg, rgba(245,200,66,0.1), rgba(249,115,22,0.08));
  border: 1px solid rgba(245,200,66,0.2);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  color: rgba(253,230,138,0.9);
}

/* Balance Card */
.vt-balance-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 16px;
  text-align: center;
}
.vt-balance-amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -1px;
  background: linear-gradient(135deg, #fff 40%, var(--gold));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.vt-balance-label { font-size: 12px; color: var(--muted); margin: 4px 0 14px; }
.vt-progress-wrap {}
.vt-progress-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 6px; }
.vt-progress-pct { color: var(--gold); }

/* Progress Track */
.vt-progress-track {
  height: 6px;
  background: rgba(255,255,255,0.07);
  border-radius: 99px;
  overflow: hidden;
}
.vt-progress-track--sm { height: 4px; }
.vt-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--violet), var(--gold));
  border-radius: 99px;
  transition: width 0.6s ease;
}
.vt-progress-fill--energy {
  background: linear-gradient(90deg, var(--cyan), var(--green));
}

/* Stats Grid */
.vt-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.vt-stat-box {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
}
.vt-stat-icon {
  width: 26px; height: 26px;
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
}
.vt-stat-label { font-size: 10px; color: var(--muted); text-align: center; }
.vt-stat-value  { font-size: 13px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }

/* Energy Bar */
.vt-energy-bar {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
}
.vt-energy-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 7px; }
.vt-energy-pct { color: var(--cyan); }

/* Tap Zone */
.vt-tap-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 8px 0;
}

/* Floating Gains */
.vt-floating-gain {
  position: absolute;
  z-index: 10;
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  color: var(--gold);
  text-shadow: 0 0 10px rgba(245,200,66,0.5);
  pointer-events: none;
}
.vt-floating-gain.is-burst {
  font-size: 20px;
  color: #fff;
  text-shadow: 0 0 16px rgba(245,200,66,0.9);
}

/* Coin Button */
.vt-coin-btn {
  position: relative;
  width: 160px; height: 160px;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  background: none;
  outline: none;
  transition: transform 0.1s;
}
.vt-coin-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(245,200,66,0.18) 0%, transparent 65%);
  border-radius: 50%;
  pointer-events: none;
  animation: glowPulse 2.5s ease-in-out infinite;
}
@keyframes glowPulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }

.vt-coin-face {
  position: relative;
  z-index: 2;
  width: 100%; height: 100%;
  border-radius: 50%;
  background: conic-gradient(from 180deg, #1a1d30, #252848, #1a1d30);
  border: 3px solid rgba(245,200,66,0.4);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px;
  box-shadow:
    0 0 0 1px rgba(245,200,66,0.15),
    inset 0 2px 20px rgba(255,255,255,0.04),
    0 12px 40px rgba(0,0,0,0.5);
}
.vt-coin-btn.is-tapping .vt-coin-face {
  border-color: rgba(245,200,66,0.7);
  box-shadow: 0 0 0 1px rgba(245,200,66,0.4), 0 0 30px rgba(245,200,66,0.25), inset 0 2px 20px rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.5);
}

.vt-coin-eyes { display: flex; gap: 10px; }
.vt-coin-eye {
  width: 9px; height: 9px;
  background: var(--gold);
  border-radius: 50%;
  box-shadow: 0 0 6px var(--gold);
}

.vt-coin-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 700;
  color: var(--gold);
  letter-spacing: 2px;
}

.vt-coin-ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.vt-coin-ring--1 {
  inset: -8px;
  border: 1px solid rgba(245,200,66,0.12);
  animation: ringPulse 3s ease-in-out infinite;
}
.vt-coin-ring--2 {
  inset: -16px;
  border: 1px solid rgba(245,200,66,0.06);
  animation: ringPulse 3s ease-in-out infinite 0.8s;
}
@keyframes ringPulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.02)} }

.vt-tap-hint { font-size: 11px; color: var(--muted); text-align: center; }

/* Tap Controls */
.vt-tap-controls { display: flex; align-items: center; gap: 12px; width: 100%; justify-content: center; }

.vt-sync-badge {
  display: flex; align-items: center; gap: 5px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 99px;
  padding: 5px 10px;
  font-size: 11px;
  color: var(--muted);
}
.vt-sync-badge.is-live { border-color: rgba(74,222,128,0.3); color: var(--green); }

.vt-pulse-dot {
  width: 6px; height: 6px;
  background: var(--muted);
  border-radius: 50%;
}
.vt-pulse-dot.is-on {
  background: var(--green);
  box-shadow: 0 0 6px var(--green);
  animation: dotBlink 1s ease-in-out infinite;
}
@keyframes dotBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }

/* Turbo Button */
.vt-turbo-btn {
  display: flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, var(--violet), #a855f7);
  border: none;
  border-radius: 99px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(139,92,246,0.35);
  font-family: inherit;
  transition: all 0.15s;
}
.vt-turbo-btn:hover:not(.is-disabled) { box-shadow: 0 6px 24px rgba(139,92,246,0.5); transform: translateY(-1px); }
.vt-turbo-btn.is-disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Panel ── */
.vt-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.vt-panel-header {
  display: flex;
  align-items: center;
  gap: 9px;
}
.vt-panel-title { font-size: 18px; font-weight: 700; }

/* Filter Bar */
.vt-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.vt-chip {
  padding: 5px 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 99px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.vt-chip:hover { border-color: var(--border2); color: var(--text); }
.vt-chip.is-active {
  background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(245,200,66,0.1));
  border-color: rgba(139,92,246,0.45);
  color: var(--text);
}

/* Card List */
.vt-card-list { display: flex; flex-direction: column; gap: 10px; }

/* Upgrade Card */
.vt-upgrade-card {
  position: relative;
  background: var(--card);
  border: 1px solid;
  border-radius: var(--radius);
  overflow: hidden;
}
.vt-upgrade-card-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.vt-upgrade-content { position: relative; z-index: 1; padding: 14px; }
.vt-upgrade-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
.vt-upgrade-thumb {
  width: 48px; height: 48px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.vt-upgrade-meta { flex: 1; min-width: 0; }
.vt-upgrade-name { font-size: 14px; font-weight: 700; line-height: 1.3; }
.vt-upgrade-cat  { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.vt-upgrade-lvl-badge {
  font-size: 11px;
  background: rgba(255,255,255,0.07);
  border: 1px solid var(--border);
  border-radius: 99px;
  padding: 3px 8px;
  flex-shrink: 0;
  white-space: nowrap;
}
.vt-upgrade-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }

.vt-boost-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 8px; }
.vt-boost-tag {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 5px 8px;
}
.vt-boost-label { font-size: 11px; color: var(--muted); }
.vt-boost-value { font-size: 12px; font-weight: 600; color: var(--green); }

.vt-upgrade-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }

/* Action Buttons */
.vt-action-btn {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.15s;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  white-space: nowrap;
}
.vt-action-btn.w-full { width: 100%; }
.vt-action-btn--primary {
  background: linear-gradient(135deg, var(--violet), #a855f7);
  color: #fff;
  box-shadow: 0 3px 12px rgba(139,92,246,0.3);
}
.vt-action-btn--primary:hover:not(.is-disabled):not(:disabled) { box-shadow: 0 5px 20px rgba(139,92,246,0.45); transform: translateY(-1px); }
.vt-action-btn--outline {
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--text);
}
.vt-action-btn--outline:hover { border-color: rgba(255,255,255,0.2); }
.vt-action-btn--stars {
  background: rgba(234,179,8,0.12);
  border: 1px solid rgba(234,179,8,0.3);
  color: var(--gold);
}
.vt-action-btn--stars:hover { background: rgba(234,179,8,0.2); }
.vt-action-btn--sm { padding: 6px 10px; font-size: 12px; }
.vt-action-btn.is-disabled, .vt-action-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
.vt-action-btn.is-claimed { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--muted); }
.vt-no-stars { display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--muted); border: 1px solid var(--border); border-radius: var(--radius-sm); }

/* Tasks */
.vt-cipher-box {
  background: var(--card);
  border: 1px solid var(--border2);
  border-radius: var(--radius);
  padding: 14px;
}
.vt-cipher-header { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; margin-bottom: 10px; color: rgba(253,230,138,0.9); }
.vt-cipher-row { display: flex; gap: 8px; }
.vt-cipher-hint { font-size: 11px; color: var(--muted); margin-top: 8px; }

.vt-input {
  flex: 1;
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border2);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  font-size: 13px;
  color: var(--text);
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.vt-input:focus { border-color: rgba(139,92,246,0.5); }

.vt-task-list { display: flex; flex-direction: column; gap: 8px; }
.vt-task-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  transition: border-color 0.15s;
}
.vt-task-row:hover { border-color: var(--border2); }
.vt-task-row.is-claimed { opacity: 0.5; }
.vt-task-info { flex: 1; min-width: 0; }
.vt-task-name { font-size: 13px; font-weight: 600; }
.vt-task-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
.vt-type-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border);
  border-radius: 99px;
  color: var(--muted);
}
.vt-task-reward { font-size: 11px; color: var(--green); font-weight: 600; }

/* Friends */
.vt-metrics-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.vt-metric-box {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
  text-align: center;
}
.vt-metric-icon { font-size: 18px; display: block; margin-bottom: 5px; }
.vt-metric-value { font-size: 15px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.vt-metric-label { font-size: 10px; color: var(--muted); margin-top: 2px; }

.vt-referral-box {
  background: var(--card);
  border: 1px solid var(--border2);
  border-radius: var(--radius);
  padding: 14px;
}
.vt-section-label { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
.vt-code-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; gap: 8px;
}
.vt-code-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--gold);
}
.vt-referral-note { font-size: 11px; color: var(--muted); margin-bottom: 10px; padding: 8px; background: rgba(255,255,255,0.04); border-radius: 7px; }
.vt-referral-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.vt-link-preview { font-size: 10px; color: rgba(107,114,128,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.vt-how-works {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
}
.vt-step-row { display: flex; align-items: flex-start; gap: 9px; font-size: 12px; color: var(--muted); margin-top: 7px; }
.vt-step-num {
  width: 20px; height: 20px;
  background: rgba(139,92,246,0.2);
  border-radius: 50%;
  font-size: 11px; font-weight: 700; color: var(--violet);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.vt-top-friends {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
}
.vt-friend-row {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 13px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
}
.vt-friend-row:last-child { border-bottom: none; }
.vt-friend-pts { font-weight: 700; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--gold); }

/* Leaderboard */
.vt-podium { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.vt-podium-item {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 8px;
  text-align: center;
  transition: transform 0.15s;
}
.vt-podium-item:hover { transform: translateY(-2px); }
.vt-podium-item.is-first { border-color: rgba(245,200,66,0.45); background: rgba(245,200,66,0.06); }
.vt-podium-item.is-second { border-color: rgba(209,213,219,0.35); }
.vt-podium-item.is-third  { border-color: rgba(249,115,22,0.35); }
.vt-podium-medal { font-size: 24px; margin-bottom: 5px; }
.vt-podium-name { font-size: 12px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vt-podium-pts  { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; }

.vt-lb-list { display: flex; flex-direction: column; gap: 6px; }
.vt-lb-row {
  display: flex; align-items: center; gap: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
}
.vt-lb-row.is-top { border-color: rgba(245,200,66,0.2); background: rgba(245,200,66,0.04); }
.vt-lb-rank { font-size: 12px; font-weight: 700; color: var(--muted); min-width: 28px; font-family: 'JetBrains Mono', monospace; }
.vt-lb-name { flex: 1; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vt-lb-pts  { font-size: 13px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--gold); }

/* Empty State */
.vt-empty {
  text-align: center;
  font-size: 13px;
  color: var(--muted);
  padding: 20px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

/* Bottom Nav */
.vt-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  max-width: 430px;
  margin: 0 auto;
  z-index: 50;
  background: rgba(7,8,15,0.9);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
}
.vt-nav-track { position: relative; height: 3px; background: var(--border); border-radius: 99px; margin: 0 8px 6px; }
.vt-nav-indicator {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, var(--violet), var(--gold));
  border-radius: 99px;
  transition: left 0.3s;
}
.vt-nav > .vt-nav-track ~ * { display: flex; }
.vt-nav { display: flex; flex-direction: column; }
.vt-nav > :last-child, .vt-nav > *:not(.vt-nav-track) {
  /* handled inline */
}
/* Correction: nav items row */
.vt-nav { flex-direction: column; }
.vt-nav-items-row { display: flex; }

/* Inline nav items */
.vt-nav .vt-nav-item, button.vt-nav-item {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 6px 4px;
  background: none; border: none; cursor: pointer;
  font-size: 11px; font-weight: 500; color: var(--muted);
  font-family: inherit;
  transition: color 0.15s;
}
.vt-nav-item.is-active { color: var(--text); }
.vt-nav-item.is-active svg { filter: drop-shadow(0 0 4px rgba(245,200,66,0.5)); color: var(--gold); }

/* Nav layout fix */
.vt-nav { padding: 0 0 calc(8px + env(safe-area-inset-bottom)); flex-direction: column; }
.vt-nav-track { flex-shrink: 0; height: 2px; margin: 0; position: relative; }
.vt-nav > .vt-nav-item { flex-direction: column; }

/* Nav items wrapper */
.vt-nav-row {
  display: flex;
}
.vt-nav-row .vt-nav-item {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 7px 4px 5px;
  background: none; border: none; cursor: pointer;
  font-size: 10px; font-weight: 500; color: var(--muted);
  font-family: inherit; transition: color 0.15s;
}
.vt-nav-row .vt-nav-item.is-active { color: var(--text); }
.vt-nav-row .vt-nav-item.is-active svg { color: var(--gold); filter: drop-shadow(0 0 4px rgba(245,200,66,0.4)); }

/* Settings Overlay & Drawer */
.vt-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 60;
  border: none; cursor: pointer;
}
.vt-drawer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  max-width: 430px;
  margin: 0 auto;
  z-index: 70;
  background: var(--surface);
  border: 1px solid var(--border2);
  border-bottom: none;
  border-radius: 20px 20px 0 0;
  padding: 0 16px calc(28px + env(safe-area-inset-bottom));
  max-height: 85dvh;
  overflow-y: auto;
  scrollbar-width: none;
}
.vt-drawer::-webkit-scrollbar { display: none; }
.vt-drawer-handle {
  width: 36px; height: 4px;
  background: var(--border2);
  border-radius: 99px;
  margin: 12px auto 8px;
}
.vt-drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 8px 0 12px; }
.vt-drawer-title { font-size: 15px; font-weight: 700; }
.vt-close-btn {
  width: 30px; height: 30px;
  background: var(--card); border: 1px solid var(--border); border-radius: 8px;
  color: var(--text); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;
}

/* Settings Body */
.vt-settings-body { display: flex; flex-direction: column; gap: 12px; }
.vt-setting-section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
}
.vt-setting-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.vt-setting-icon {
  width: 30px; height: 30px;
  background: rgba(139,92,246,0.15);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: var(--violet); flex-shrink: 0; margin-top: 1px;
}
.vt-setting-title { font-size: 13px; font-weight: 600; }
.vt-setting-desc  { font-size: 11px; color: var(--muted); margin-top: 1px; }

.vt-select {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border2);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  font-size: 13px;
  color: var(--text);
  font-family: inherit;
  outline: none;
}

.vt-mini-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.vt-mini-stat {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px;
}
.vt-mini-stat-head { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--muted); margin-bottom: 5px; }
.vt-mini-stat-val  { font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.vt-wallet-loading {
  height: 44px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: var(--muted);
}

.vt-info-box {
  background: rgba(245,200,66,0.06);
  border: 1px solid rgba(245,200,66,0.2);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  font-size: 12px;
  color: rgba(253,230,138,0.85);
}
`;