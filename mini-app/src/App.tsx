import {
  Suspense, lazy, useEffect, useMemo, useRef, useState,
  useCallback, memo,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot, Coins, Crown, Globe, Home, ListChecks, Settings,
  ShieldCheck, Sparkles, Star, TrendingUp, Trophy, Users,
  Wallet, Zap, Flame, Award, ChevronUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import WebApp from "@twa-dev/sdk";

import { api } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import {
  getTelegramInitData, getTelegramUser, initTelegram,
  getTelegramStartParam, isTelegramWebApp, openTelegramInvoice,
} from "@/lib/telegram";
import { cn, formatNumber } from "@/lib/utils";
import type { LeaderboardItem, Task, UiSettings, Upgrade, User } from "@/types/api";

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════ */
const RTL_LANGS                     = new Set(["ar", "fa"]);
const SUPPORTED_LANGS               = ["ar", "en", "ru", "tr", "es", "fa", "id"] as const;
const TAP_FLUSH_DELAY_MS            = 18;
const TURBO_TAP_SIZE                = 10;
const TURBO_COOLDOWN_MS             = 4500;
const TAP_FLUSH_BATCH               = 500;
const TAP_FLUSH_IMMEDIATE_THRESHOLD = 6;
const ENERGY_WARNING_COOLDOWN_MS    = 900;
const PENDING_REFERRAL_KEY          = "vt-referral-code";
const COMBO_DECAY_MS                = 3200;
const STREAK_BONUS_THRESHOLD        = 5;

/* ═══════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════ */
type BoardType    = "global" | "weekly" | "friends";
type ActiveTab    = "home" | "upgrades" | "tasks" | "friends" | "leaderboard";
type TaskFilter   = "all" | "DAILY" | "SOCIAL" | "CIPHER";
type FloatingGain = { id: number; value: number; left: number; top: number; burst: boolean };
type ReferralStats = {
  level1Count: number;
  level2Count: number;
  estimatedRewards: number;
  referrals: Array<{ id: string; name: string; points: string }>;
};
type NavItem = { key: ActiveTab; labelAr: string; labelEn: string; icon: LucideIcon };
type Achievement = { id: string; title: string; icon: string; ts: number };

/* ═══════════════════════════════════════════════════════════════════
   CANVAS PARTICLE SYSTEM — runs entirely off React render cycle
═══════════════════════════════════════════════════════════════════ */
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
  burst: boolean;
}

const PARTICLE_COLORS = [
  "#fbbf24","#f59e0b","#34d399","#22d3ee",
  "#a78bfa","#f472b6","#fb923c","#ffffff",
];

function createParticleBurst(
  canvas: HTMLCanvasElement,
  x: number, y: number,
  count: number, burst: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle  = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed  = burst ? 4 + Math.random() * 7 : 1.5 + Math.random() * 3.5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (burst ? 3 : 1),
      life: 1,
      maxLife: burst ? 0.016 : 0.022,
      size: burst ? 3 + Math.random() * 4 : 2 + Math.random() * 2,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)] ?? "#fbbf24",
      burst,
    });
  }
  let rafId = 0;
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.18;
      p.vx *= 0.97;
      p.life -= p.maxLife;
      if (p.life <= 0) continue;
      alive = true;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (alive) rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  setTimeout(() => cancelAnimationFrame(rafId), burst ? 1400 : 950);
}

/* ═══════════════════════════════════════════════════════════════════
   NAV ITEMS
═══════════════════════════════════════════════════════════════════ */
const NAV_ITEMS: NavItem[] = [
  { key: "home",        labelAr: "الرئيسية", labelEn: "Home",    icon: Home        },
  { key: "upgrades",   labelAr: "الترقيات", labelEn: "Store",   icon: TrendingUp  },
  { key: "tasks",      labelAr: "المهام",   labelEn: "Tasks",   icon: ListChecks  },
  { key: "friends",    labelAr: "الأصدقاء", labelEn: "Friends", icon: Users       },
  { key: "leaderboard",labelAr: "المتصدرون",labelEn: "Leaders", icon: Trophy      },
];

/* ═══════════════════════════════════════════════════════════════════
   LAZY COMPONENTS
═══════════════════════════════════════════════════════════════════ */
type TonWalletProps = { className?: string; manifestUrl: string };
const TonWalletLazy = lazy(async () => {
  const mod = await import("@tonconnect/ui-react");
  const C = ({ className, manifestUrl }: TonWalletProps) => (
    <mod.TonConnectUIProvider manifestUrl={manifestUrl}>
      <mod.TonConnectButton className={className} />
    </mod.TonConnectUIProvider>
  );
  return { default: C };
});

/* ═══════════════════════════════════════════════════════════════════
   AUDIO — single AudioContext, pooled oscillators
═══════════════════════════════════════════════════════════════════ */
type AudioContextCtor = typeof AudioContext;
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (_audioCtx) return _audioCtx;
  const Ctor = window.AudioContext
    || ((window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ?? null);
  if (!Ctor) return null;
  _audioCtx = new Ctor();
  return _audioCtx;
}

const PITCH_STEPS = [420, 480, 520, 560, 600, 660];
let pitchIdx = 0;

function playTapSound(combo = 1) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  const pitch = PITCH_STEPS[Math.min(PITCH_STEPS.length - 1, Math.floor(combo / 3))] ?? 520;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = pitch;
  gain.gain.setValueAtTime(0.055, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.07);
  pitchIdx = (pitchIdx + 1) % PITCH_STEPS.length;
}

function playAchievementSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  [523, 659, 784, 1047].forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.type = "sine";
    g.gain.setValueAtTime(0, ctx.currentTime + i * 0.11);
    g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + i * 0.11 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.11 + 0.18);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.11);
    o.stop(ctx.currentTime + i * 0.11 + 0.2);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */
function categoryAccentColor(cat: string): string {
  const map: Record<string, string> = {
    tap:     "#f59e0b", pph:      "#22d3ee",
    energy:  "#34d399", autotap:  "#c084fc",
    legendary:"#fbbf24",
  };
  return map[cat] ?? "#94a3b8";
}

function numericFromStr(s: string): number {
  try {
    const v = BigInt(s);
    return v > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(v);
  } catch { return Number(s) || 0; }
}

function addToNumericStr(s: string, n: number): string {
  if (n <= 0) return s;
  try { return (BigInt(s) + BigInt(n)).toString(); }
  catch { return String((Number(s) || 0) + n); }
}

function fmtFull(v: number | string): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.floor(n));
}

function canAfford(cost: number, pts: string): boolean {
  try { return BigInt(pts) >= BigInt(cost); }
  catch { return Number(pts) >= cost; }
}

function normalizeReferralCode(value?: string | null): string | undefined {
  const clean = value?.trim();
  if (!clean) return undefined;
  const lowered = clean.toLowerCase();
  if (lowered.startsWith("buy_") || lowered.startsWith("stars_")) return undefined;
  return clean.toUpperCase();
}

/* Framer variants — defined outside component to avoid recreation */
const screenVariants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -20 : 20 }),
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0  },
};

const SCREEN_TRANSITION = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] };

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS — memo-ised to prevent cascade re-renders
═══════════════════════════════════════════════════════════════════ */
const EnergyBar = memo(({ pct }: { pct: number }) => (
  <div className="vt-energy-card">
    <div className="vt-energy-head">
      <span><Zap size={11} style={{ display:"inline", marginInlineEnd:4 }} />Energy</span>
      <span style={{ color:"var(--g-400)", fontFamily:"var(--font-mono)", fontSize:11 }}>{pct}%</span>
    </div>
    <div className="vt-energy-track">
      <motion.div
        className="vt-energy-fill"
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      />
    </div>
    {pct < 20 && (
      <motion.p
        className="vt-energy-warn"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        ⚠️ Low energy — recharging…
      </motion.p>
    )}
  </div>
));
EnergyBar.displayName = "EnergyBar";

const AchievementToast = memo(({ items, onDone }: { items: Achievement[]; onDone: (id: string) => void }) => (
  <AnimatePresence>
    {items.map(a => (
      <motion.div
        key={a.id}
        className="vt-achievement"
        initial={{ opacity: 0, y: -60, scale: 0.8 }}
        animate={{ opacity: 1, y: 0,   scale: 1   }}
        exit={{   opacity: 0, y: -60, scale: 0.8  }}
        transition={{ type:"spring", stiffness:420, damping:28 }}
        onAnimationComplete={() => setTimeout(() => onDone(a.id), 2400)}
      >
        <span className="vt-ach-icon">{a.icon}</span>
        <div>
          <p className="vt-ach-title">Achievement!</p>
          <p className="vt-ach-body">{a.title}</p>
        </div>
      </motion.div>
    ))}
  </AnimatePresence>
));
AchievementToast.displayName = "AchievementToast";

const ComboFire = memo(({ combo }: { combo: number }) => {
  if (combo < 3) return null;
  const level = combo >= 20 ? 3 : combo >= 10 ? 2 : 1;
  const flames = ["🔥","🔥🔥","🔥🔥🔥"][level - 1];
  return (
    <motion.div
      className="vt-combo-fire"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.3, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
    >
      <span className="vt-combo-flames">{flames}</span>
      <span className="vt-combo-x">×{combo}</span>
      <span className="vt-combo-label">COMBO</span>
    </motion.div>
  );
});
ComboFire.displayName = "ComboFire";

const PPHCounter = memo(({ pph }: { pph: number }) => {
  const [display, setDisplay] = useState(pph);
  useEffect(() => {
    const start = Date.now();
    const from  = display;
    const diff  = pph - from;
    if (Math.abs(diff) < 1) return;
    let raf = 0;
    const animate = () => {
      const t = Math.min(1, (Date.now() - start) / 600);
      setDisplay(Math.round(from + diff * t));
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pph]);
  return <>{formatNumber(display)}</>;
});
PPHCounter.displayName = "PPHCounter";

/* ═══════════════════════════════════════════════════════════════════
   APP
═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const { t, i18n } = useTranslation();
  const tonManifestUrl = import.meta.env.VITE_TON_MANIFEST_URL
    ?? "https://bottele-mini-app.vercel.app/tonconnect-manifest.json";
  const socketEnabled = import.meta.env.VITE_DISABLE_SOCKET !== "true";
  const botUsername   = (
    import.meta.env.VITE_BOT_USERNAME
    ?? import.meta.env.VITE_TELEGRAM_BOT_USERNAME
    ?? ""
  ).toString().replace("@", "").trim();

  /* ── State ── */
  const [loading,       setLoading]       = useState(true);
  const [outsideTg,     setOutsideTg]     = useState(false);
  const [user,          setUser]          = useState<User | null>(null);
  const [upgrades,      setUpgrades]      = useState<Upgrade[]>([]);
  const [tasks,         setTasks]         = useState<Task[]>([]);
  const [leaderboard,   setLeaderboard]   = useState<LeaderboardItem[]>([]);
  const [activeTab,     setActiveTab]     = useState<ActiveTab>("home");
  const [tabDir,        setTabDir]        = useState(1);
  const [boardType,     setBoardType]     = useState<BoardType>("global");
  const [upgFilter,     setUpgFilter]     = useState("all");
  const [taskFilter,    setTaskFilter]    = useState<TaskFilter>("all");
  const [referral,      setReferral]      = useState<{ directReferrals: number; referralCode: string } | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [activeEvents,  setActiveEvents]  = useState<Array<{ id: string; nameAr: string; nameEn: string; multiplier: number }>>([]);
  const [cipherInput,   setCipherInput]   = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [tapping,       setTapping]       = useState(false);
  const [floatingGains, setFloatingGains] = useState<FloatingGain[]>([]);
  const [turboUntil,    setTurboUntil]    = useState(0);
  const [tick,          setTick]          = useState(() => Date.now());
  const [syncing,       setSyncing]       = useState(false);
  const [uiSettings,    setUiSettings]    = useState<UiSettings>({ tapIconMode: "emoji", tapIconValue: "VT" });
  const [tapIconBroken, setTapIconBroken] = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [codeCopied,    setCodeCopied]    = useState(false);
  const [ripples,       setRipples]       = useState<Array<{ id: number; x: number; y: number }>>([]);

  /* ── NEW STATE ── */
  const [tapCombo,      setTapCombo]      = useState(0);
  const [achievements,  setAchievements]  = useState<Achievement[]>([]);
  const [tapStreak,     setTapStreak]     = useState(0);
  const [showLevelUp,   setShowLevelUp]   = useState(false);
  const [prevLevel,     setPrevLevel]     = useState(0);
  const [coinTilt,      setCoinTilt]      = useState({ x: 0, y: 0 });

  /* ── Refs ── */
  const userRef        = useRef<User | null>(null);
  const pendingTaps    = useRef(0);
  const flushing       = useRef(false);
  const flushTimer     = useRef<number | null>(null);
  const lastSound      = useRef(0);
  const lastEnergyWarn = useRef(0);
  const coinRef        = useRef<HTMLButtonElement>(null);
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const comboTimer     = useRef<number | null>(null);
  const tapStreakRef   = useRef(0);
  const achievedRef   = useRef(new Set<string>());

  /* ── Derived ── */
  const isRtl = RTL_LANGS.has(i18n.language);
  const S = useCallback((ar: string, en: string) => isRtl ? ar : en, [isRtl]);

  const displayName = useMemo(
    () => user?.firstName?.trim() || user?.username?.trim()
      || `Player #${String(user?.telegramId ?? "").slice(-4) || "0000"}`,
    [user?.firstName, user?.username, user?.telegramId],
  );

  const referralLink = useMemo(() => {
    const code = referral?.referralCode?.trim();
    return code && botUsername
      ? `https://t.me/${botUsername}?start=${encodeURIComponent(code)}`
      : "";
  }, [botUsername, referral?.referralCode]);

  const energyPct = useMemo(() => {
    if (!user || user.maxEnergy === 0) return 0;
    return Math.min(100, Math.round((user.energy / user.maxEnergy) * 100));
  }, [user?.energy, user?.maxEnergy]);

  const turboSecs = useMemo(
    () => Math.ceil(Math.max(0, turboUntil - tick) / 1000),
    [turboUntil, tick],
  );

  const pts    = useMemo(() => numericFromStr(user?.points ?? "0"), [user?.points]);
  const lvl    = useMemo(() => Math.min(105, Math.max(1, Math.floor(Math.pow(pts + 400, 0.17)))), [pts]);
  const lvlPct = useMemo(() => {
    if (!user || lvl >= 105) return 100;
    const prev = Math.floor(Math.pow(lvl + 2, 3) * 120);
    const next = Math.floor(Math.pow(lvl + 3, 3) * 120);
    return Math.min(100, Math.max(0, Math.round(((pts - prev) / Math.max(1, next - prev)) * 100)));
  }, [lvl, pts, user]);

  const upgCategories = useMemo(
    () => ["all", ...Array.from(new Set(upgrades.map(u => u.category)))],
    [upgrades],
  );
  const filteredUpgrades = useMemo(
    () => upgrades
      .filter(u => upgFilter === "all" || u.category === upgFilter)
      .sort((a, b) => a.unlockLevel - b.unlockLevel || a.baseCost - b.baseCost),
    [upgrades, upgFilter],
  );
  const filteredTasks = useMemo(
    () => tasks.filter(t => taskFilter === "all" || t.type === taskFilter),
    [tasks, taskFilter],
  );

  const navActiveIdx = useMemo(
    () => Math.max(0, NAV_ITEMS.findIndex(i => i.key === activeTab)),
    [activeTab],
  );

  const eventMultiplier = useCallback(
    () => activeEvents.reduce((h, e) => Math.max(h, e.multiplier), 1),
    [activeEvents],
  );

  const tapIconValue = useMemo(
    () => uiSettings.tapIconValue?.trim() || "VT",
    [uiSettings.tapIconValue],
  );
  const showTapIconImage = useMemo(
    () =>
      uiSettings.tapIconMode === "image"
      && /^(https?:\/\/|data:image\/)/i.test(tapIconValue)
      && !tapIconBroken,
    [uiSettings.tapIconMode, tapIconValue, tapIconBroken],
  );

  /* ── Achievement checker ── */
  const checkAchievement = useCallback((id: string, title: string, icon: string) => {
    if (achievedRef.current.has(id)) return;
    achievedRef.current.add(id);
    const ach: Achievement = { id, title, icon, ts: Date.now() };
    setAchievements(p => [...p, ach]);
    playAchievementSound();
  }, []);

  const dismissAchievement = useCallback((id: string) => {
    setAchievements(p => p.filter(a => a.id !== id));
  }, []);

  /* ── Level up detection ── */
  useEffect(() => {
    if (prevLevel === 0) { setPrevLevel(lvl); return; }
    if (lvl > prevLevel) {
      setShowLevelUp(true);
      checkAchievement(`lvl-${lvl}`, `Reached Level ${lvl}!`, "⭐");
      setTimeout(() => setShowLevelUp(false), 2800);
      try { WebApp.HapticFeedback.notificationOccurred("success"); } catch { /* ignore */ }
    }
    setPrevLevel(lvl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lvl]);

  /* ── Tab change ── */
  const changeTab = useCallback((next: ActiveTab) => {
    if (next === activeTab) return;
    const nextIdx = NAV_ITEMS.findIndex(i => i.key === next);
    setTabDir(isRtl ? (nextIdx < navActiveIdx ? 1 : -1) : (nextIdx > navActiveIdx ? 1 : -1));
    setActiveTab(next);
  }, [activeTab, isRtl, navActiveIdx]);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { setTapIconBroken(false); }, [uiSettings.tapIconMode, uiSettings.tapIconValue]);

  /* ── Resize canvas to match container ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  /* ── Data loaders ── */
  const loadFast = useCallback(async () => {
    const gs = await api.gameMe();
    setUser(gs.user); setUpgrades(gs.upgrades);
    setReferral(gs.referral); setActiveEvents(gs.activeEvents);
    if (gs.uiSettings?.tapIconValue) setUiSettings(gs.uiSettings);
  }, []);

  const loadSecondary = useCallback(async (board: BoardType) => {
    const [ts, lb, ref] = await Promise.all([api.getTasks(), api.leaderboard(board), api.referrals()]);
    setTasks(ts.tasks); setLeaderboard(lb); setReferralStats(ref);
  }, []);

  /* ── Init ── */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        initTelegram();
        const inTg = isTelegramWebApp();
        const params = new URLSearchParams(window.location.search);
        if (!inTg && params.get("dev") !== "1") { setOutsideTg(true); setLoading(false); return; }
        const tgUser   = getTelegramUser();
        const initData = getTelegramInitData();
        const fbId     = localStorage.getItem("vt-id") ?? String(Date.now()).slice(-10);
        localStorage.setItem("vt-id", fbId);
        const queryReferral        = normalizeReferralCode(params.get("startapp") || params.get("start") || params.get("ref"));
        const telegramStartReferral = normalizeReferralCode(getTelegramStartParam());
        const cachedReferral        = normalizeReferralCode(localStorage.getItem(PENDING_REFERRAL_KEY));
        const referralCode          = queryReferral || telegramStartReferral || cachedReferral;
        if (referralCode) localStorage.setItem(PENDING_REFERRAL_KEY, referralCode);

        const login = await api.login({
          telegramId: tgUser?.id ?? fbId,
          username:   tgUser?.username, firstName: tgUser?.firstName,
          lastName:   tgUser?.lastName, language:  tgUser?.languageCode ?? "ar",
          referralCode, initData: initData ?? undefined,
        });
        api.setToken(login.token);
        if (referralCode) localStorage.removeItem(PENDING_REFERRAL_KEY);

        if (socketEnabled) {
          const sock = connectSocket(login.token);
          sock.on("user:update",       (p: User)              => { if (mounted) setUser(p); });
          sock.on("leaderboard:update",(p: LeaderboardItem[]) => { if (mounted && boardType === "global") setLeaderboard(p); });
          sock.on("mass:notification", (p: { title: string; body: string }) => toast.info(p.title, { description: p.body }));
        }
        await loadFast();
        if (mounted) setLoading(false);
        void loadSecondary(boardType).catch(() => undefined);
        const lang = login.user.language as (typeof SUPPORTED_LANGS)[number];
        await i18n.changeLanguage(SUPPORTED_LANGS.includes(lang) ? lang : "ar");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("common.error"));
      } finally { if (mounted) setLoading(false); }
    })();
    return () => {
      mounted = false;
      if (socketEnabled) disconnectSocket();
      if (flushTimer.current !== null) { clearTimeout(flushTimer.current); flushTimer.current = null; }
      if (comboTimer.current !== null) { clearTimeout(comboTimer.current); }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    void api.leaderboard(boardType).then(setLeaderboard).catch(() => undefined);
  }, [boardType, user?.id]);

  useEffect(() => {
    const iv = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir  = isRtl ? "rtl" : "ltr";
  }, [i18n.language, isRtl]);

  /* ─── Tap engine ─── */
  const spawnGain = useCallback((value: number, burst = false) => {
    const id = Date.now() + Math.floor(Math.random() * 999);
    setFloatingGains(prev => {
      const trimmed = prev.length > 6 ? prev.slice(-6) : prev;
      return [...trimmed, {
        id, value, burst,
        left: 32 + Math.random() * 36,
        top:  20 + Math.random() * 28,
      }];
    });
    setTimeout(() => setFloatingGains(p => p.filter(g => g.id !== id)), burst ? 1200 : 950);
  }, []);

  const spawnRipple = useCallback((e: React.PointerEvent) => {
    const rect = coinRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = Date.now();
    setRipples(prev => [...prev.slice(-4), {
      id,
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    }]);
    setTimeout(() => setRipples(p => p.filter(r => r.id !== id)), 700);
  }, []);

  /* Particle burst via canvas */
  const spawnParticles = useCallback((burst = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width  / 2;
    const cy = rect.height / 2;
    createParticleBurst(canvas, cx, cy, burst ? 28 : 10, burst);
  }, []);

  const scheduleFlush = useCallback((delay = TAP_FLUSH_DELAY_MS) => {
    if (flushTimer.current !== null) return;
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null;
      void doFlush();
    }, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doFlush = useCallback(async () => {
    if (flushing.current || pendingTaps.current <= 0) return;
    flushing.current = true; setSyncing(true);
    const batch = Math.min(TAP_FLUSH_BATCH, pendingTaps.current);
    pendingTaps.current -= batch;
    try {
      const r = await api.tap(batch);
      userRef.current = r.user; setUser(r.user);
    } catch (err) {
      pendingTaps.current = 0;
      toast.error(err instanceof Error ? err.message : t("common.error"));
      try {
        const gs = await api.gameMe();
        userRef.current = gs.user; setUser(gs.user);
        setUpgrades(gs.upgrades); setReferral(gs.referral); setActiveEvents(gs.activeEvents);
        if (gs.uiSettings?.tapIconValue) setUiSettings(gs.uiSettings);
      } catch { /* ignore */ }
    } finally {
      flushing.current = false;
      if (pendingTaps.current > 0) scheduleFlush(10); else setSyncing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleFlush]);

  const resetComboTimer = useCallback(() => {
    if (comboTimer.current !== null) clearTimeout(comboTimer.current);
    comboTimer.current = window.setTimeout(() => {
      setTapCombo(0);
      tapStreakRef.current = 0;
      setTapStreak(0);
    }, COMBO_DECAY_MS);
  }, []);

  const enqueueTaps = useCallback((count: number): number => {
    const cu = userRef.current;
    if (!cu || cu.energy <= 0 || count <= 0) return 0;
    const real = Math.min(count, cu.energy);
    const gain = Math.max(1, Math.floor(cu.tapPower * cu.comboMultiplier * eventMultiplier())) * real;
    const next: User = {
      ...cu,
      energy:    Math.max(0, cu.energy - real),
      points:    addToNumericStr(cu.points, gain),
      totalTaps: addToNumericStr(cu.totalTaps, real),
    };
    userRef.current = next; setUser(next);
    spawnGain(gain);
    pendingTaps.current += real;
    if (pendingTaps.current >= TAP_FLUSH_IMMEDIATE_THRESHOLD) void doFlush();
    else scheduleFlush();
    return real;
  }, [doFlush, eventMultiplier, scheduleFlush, spawnGain]);

  /* Coin 3D tilt on pointer move */
  const handleCoinMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = coinRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width  / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setCoinTilt({ x: dy * -12, y: dx * 12 });
  }, []);
  const handleCoinMouseLeave = useCallback(() => {
    setCoinTilt({ x: 0, y: 0 });
  }, []);

  const handleTap = useCallback((e: React.PointerEvent) => {
    if (!enqueueTaps(1)) {
      const now = Date.now();
      if (now - lastEnergyWarn.current >= ENERGY_WARNING_COOLDOWN_MS) {
        toast.warning(t("tap.energyLow")); lastEnergyWarn.current = now;
      }
      return;
    }
    spawnRipple(e);
    spawnParticles(false);
    setTapping(true);
    const now = Date.now();
    const newCombo = tapCombo + 1;
    setTapCombo(newCombo);
    tapStreakRef.current += 1;
    setTapStreak(tapStreakRef.current);
    resetComboTimer();

    /* Achievement checks */
    if (newCombo === 10)  checkAchievement("combo-10",  "10x Combo!",   "🔥");
    if (newCombo === 50)  checkAchievement("combo-50",  "50x Inferno!", "🌋");
    if (newCombo === 100) checkAchievement("combo-100", "UNSTOPPABLE!", "💥");

    if (now - lastSound.current > 35) {
      playTapSound(newCombo);
      lastSound.current = now;
    }
    try { WebApp.HapticFeedback.impactOccurred("light"); } catch { /* ignore */ }
    setTimeout(() => setTapping(false), 140);
  }, [checkAchievement, enqueueTaps, resetComboTimer, spawnParticles, spawnRipple, t, tapCombo]);

  const handleTurbo = useCallback(() => {
    const now = Date.now();
    if (now < turboUntil) {
      toast.warning(S(`انتظر ${turboSecs}ث`, `Wait ${turboSecs}s`)); return;
    }
    if (!enqueueTaps(TURBO_TAP_SIZE)) {
      if (now - lastEnergyWarn.current >= ENERGY_WARNING_COOLDOWN_MS) {
        toast.warning(t("tap.energyLow")); lastEnergyWarn.current = now;
      }
      return;
    }
    const snap = userRef.current;
    if (snap) spawnGain(
      Math.max(1, Math.floor(TURBO_TAP_SIZE * snap.tapPower * snap.comboMultiplier * eventMultiplier())),
      true,
    );
    spawnParticles(true);
    setTurboUntil(now + TURBO_COOLDOWN_MS);
    setTapping(true); playTapSound(tapCombo);
    try { WebApp.HapticFeedback.impactOccurred("heavy"); } catch { /* ignore */ }
    setTimeout(() => setTapping(false), 215);
  }, [S, enqueueTaps, eventMultiplier, spawnGain, spawnParticles, t, tapCombo, turboSecs, turboUntil]);

  /* ─── Upgrade actions ─── */
  const buyUpgrade = useCallback(async (id: string) => {
    try {
      await doFlush();
      const r = await api.buyUpgrade(id);
      setUser(r.user); userRef.current = r.user;
      const gs = await api.gameMe(); setUpgrades(gs.upgrades);
      toast.success(r.message);
      checkAchievement("first-upgrade", "First Upgrade!", "⚡");
    } catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
  }, [checkAchievement, doFlush, t]);

  const buyWithStars = useCallback(async (upg: Upgrade) => {
    if (!upg.starsPrice || upg.starsPrice <= 0) {
      toast.warning(S("لا تدعم النجوم", "Not available for Stars.")); return;
    }
    try {
      await doFlush();
      const inv    = await api.createStarsInvoice(upg.key);
      const status = await openTelegramInvoice(inv.invoiceLink);
      if      (status === "paid")      { toast.success(S("تم الدفع ✓", "Payment complete ✓")); await loadFast(); }
      else if (status === "cancelled") toast.info(S("تم الإلغاء", "Cancelled"));
      else if (status === "failed")    toast.error(S("فشل الدفع", "Payment failed"));
      else window.open(inv.invoiceLink, "_blank", "noopener,noreferrer");
    } catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
  }, [S, doFlush, loadFast, t]);

  const claimTask = useCallback(async (task: Task) => {
    try {
      await doFlush();
      const r = await api.claimTask(task.id, task.type === "CIPHER" ? cipherInput : undefined);
      toast.success(`${r.message} +${r.reward}`);
      const [ts, gs] = await Promise.all([api.getTasks(), api.gameMe()]);
      setTasks(ts.tasks); setUser(gs.user); userRef.current = gs.user; setCipherInput("");
      checkAchievement("task-done", "Task Complete!", "✅");
    } catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
  }, [checkAchievement, cipherInput, doFlush, t]);

  const claimAirdrop = useCallback(async () => {
    if (!walletAddress.trim()) { toast.warning(t("wallet.placeholder")); return; }
    try {
      await doFlush();
      const r = await api.claimAirdrop(walletAddress.trim());
      toast.success(`${t("wallet.claim")} ${formatNumber(r.estimatedJetton)}`);
      setWalletAddress(r.walletAddress);
    } catch (err) { toast.error(err instanceof Error ? err.message : t("common.error")); }
  }, [doFlush, t, walletAddress]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(referral?.referralCode ?? "")
      .then(() => { setCodeCopied(true); toast.success(S("تم النسخ", "Copied")); setTimeout(() => setCodeCopied(false), 2200); })
      .catch(() => toast.error("Failed"));
  }, [S, referral?.referralCode]);

  const copyLink = useCallback(() => {
    if (!referralLink) { toast.warning(S("أضف VITE_BOT_USERNAME", "Set VITE_BOT_USERNAME")); return; }
    navigator.clipboard.writeText(referralLink)
      .then(() => toast.success(S("تم نسخ الرابط", "Link copied")))
      .catch(() => toast.error("Failed"));
  }, [S, referralLink]);

  const shareLink = useCallback(() => {
    if (!referralLink) { toast.warning(S("أضف VITE_BOT_USERNAME", "Set VITE_BOT_USERNAME")); return; }
    const text = S("انضم إلى TOMI:", "Join TOMI:");
    const url  = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    try { if (isTelegramWebApp()) WebApp.openTelegramLink(url); else window.open(url, "_blank"); }
    catch { window.open(url, "_blank"); }
  }, [S, referralLink]);

  /* ═══════════════════════════════════════════════════════════════════
     LOADING
  ═══════════════════════════════════════════════════════════════════ */
  if (loading) return (
    <div className="vt-shell">
      <div className="vt-bg" aria-hidden>
        <div className="vt-bg-blob vt-bg-blob--gold" />
        <div className="vt-bg-blob vt-bg-blob--teal" />
        <div className="vt-bg-blob vt-bg-blob--violet" />
        <div className="vt-bg-grid" />
      </div>
      <div className="vt-center-screen">
        <div className="vt-splash">
          <div className="vt-splash-orb">
            <div className="vt-splash-ring vt-splash-ring--1" />
            <div className="vt-splash-ring vt-splash-ring--2" />
            <div className="vt-splash-ring vt-splash-ring--3" />
            <div className="vt-splash-center">
              <span className="vt-splash-logo-text">VT</span>
            </div>
          </div>
          <div className="vt-splash-dots"><span /><span /><span /></div>
          <p className="vt-splash-tagline">{S("اضغط · اكسب · ارتقِ", "Tap · Earn · Rise")}</p>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     OUTSIDE TELEGRAM
  ═══════════════════════════════════════════════════════════════════ */
  if (outsideTg) return (
    <div className="vt-shell">
      <div className="vt-bg" aria-hidden>
        <div className="vt-bg-blob vt-bg-blob--gold" />
        <div className="vt-bg-grid" />
      </div>
      <div className="vt-center-screen">
        <motion.div
          className="vt-guard-card"
          initial={{ opacity: 0, scale: 0.86, y: 22 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 255, damping: 22 }}
        >
          <div className="vt-guard-icon"><ShieldCheck size={30} /></div>
          <h2 className="vt-guard-title">TOMI</h2>
          <p className="vt-guard-body">{S("يعمل داخل تليجرام فقط لحماية حسابك.", "Only works inside Telegram to protect your account.")}</p>
          <p className="vt-guard-hint">{S("افتح البوت واضغط زر التشغيل.", "Open the bot and tap the launch button.")}</p>
        </motion.div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="vt-shell">
      <div className="vt-center-screen">
        <div className="vt-guard-card">
          <p style={{ textAlign:"center", color:"var(--t-3)" }}>{t("common.error")}</p>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     HOME SCREEN
  ═══════════════════════════════════════════════════════════════════ */
  const homeScreen = (
    <div className="vt-home">

      {/* Level-up burst overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            className="vt-levelup-overlay"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 0.45 }}
          >
            <span className="vt-levelup-text">LEVEL UP!</span>
            <span className="vt-levelup-num">⭐ {lvl}</span>
            <div className="vt-levelup-rays" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="vt-home-header">
        <div className="vt-brand">
          <div className="vt-brand-mark"><Zap size={17} strokeWidth={2.5} /></div>
          <div className="vt-brand-text">
            <p className="vt-brand-name">TOMI</p>
            <p className="vt-brand-sub">{S("اضغط واكسب", "Tap & Earn")}</p>
          </div>
        </div>
        <div className="vt-hdr-actions">
          {tapStreak >= STREAK_BONUS_THRESHOLD && (
            <motion.div
              className="vt-streak-badge"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              <Flame size={12} /> {tapStreak}
            </motion.div>
          )}
          <motion.button whileTap={{ scale: 0.86 }} className="vt-hbtn" onClick={() => setSettingsOpen(true)}>
            <Settings size={16} strokeWidth={1.8} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.86 }} className="vt-hbtn vt-hbtn--accent" onClick={() => changeTab("leaderboard")}>
            <Trophy size={16} strokeWidth={1.8} />
          </motion.button>
        </div>
      </div>

      {/* Player */}
      <motion.div
        className="vt-card vt-player"
        variants={cardVariants} initial="hidden" animate="show"
        transition={{ delay: 0.04 }}
      >
        <div className="vt-player-avatar">
          {(displayName[0] ?? "V").toUpperCase()}
          <span className="vt-avatar-ring" />
        </div>
        <div className="vt-player-info">
          <p className="vt-player-name">{displayName}</p>
          <div className="vt-level-wrap">
            <div className="vt-level-bar">
              <motion.div
                className="vt-level-fill"
                initial={{ width: 0 }}
                animate={{ width: `${lvlPct}%` }}
                transition={{ duration: 1, ease: [0.22,1,0.36,1], delay: 0.4 }}
              />
            </div>
            <p className="vt-level-text">
              <Crown size={9} style={{ color:"var(--g-400)" }} />
              &nbsp;{S("مستوى","Lvl")} {lvl} · {lvlPct}%
            </p>
          </div>
        </div>
        <div className="vt-status-badge">
          <div className="vt-status-dot" />
          {S("متصل", "Online")}
        </div>
      </motion.div>

      {/* Active events */}
      <AnimatePresence>
        {activeEvents.length > 0 && (
          <motion.div
            className="vt-event-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Sparkles size={13} style={{ flexShrink:0 }} />
            <span className="vt-event-text">
              {activeEvents.slice(0, 2).map(e => `${S(e.nameAr, e.nameEn)} ×${e.multiplier}`).join(" • ")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance */}
      <motion.div
        className="vt-balance-card"
        variants={cardVariants} initial="hidden" animate="show"
        transition={{ delay: 0.09 }}
      >
        <p className="vt-balance-label">{S("إجمالي النقاط", "Total Points")}</p>
        <p className="vt-balance-amount">{fmtFull(user.points)}</p>
        <p className="vt-balance-currency">VT Coins</p>
        <div className="vt-xp-wrap">
          <div className="vt-xp-head">
            <span>⭐ {S("المستوى", "Level")} {lvl}</span>
            <span>{lvlPct}% / 100%</span>
          </div>
          <div className="vt-xp-track">
            <motion.div
              className="vt-xp-fill"
              initial={{ width: 0 }}
              animate={{ width: `${lvlPct}%` }}
              transition={{ duration: 1.2, ease: [0.22,1,0.36,1], delay: 0.5 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="vt-stats-row">
        {[
          { icon: "⚡", label: S("الطاقة","Energy"),  val: `${user.energy}/${user.maxEnergy}`, accent: "var(--g-400)"  },
          { icon: "🔥", label: S("الكومبو","Combo"),  val: `${user.comboMultiplier.toFixed(2)}×`, accent: "var(--v-400)" },
          { icon: "💰", label: "PPH",                 val: <PPHCounter pph={user.pph} />,        accent: "var(--c-400)"  },
        ].map((s, i) => (
          <motion.div
            key={String(s.label)}
            className="vt-stat-card"
            style={{ "--accent-line": s.accent } as React.CSSProperties}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 + i * 0.06 }}
          >
            <span className="vt-stat-icon">{s.icon}</span>
            <p className="vt-stat-value">{s.val}</p>
            <p className="vt-stat-label">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Combo fire — only renders when combo ≥ 3 */}
      <AnimatePresence>
        {tapCombo >= 3 && <ComboFire key="combo" combo={tapCombo} />}
      </AnimatePresence>

      {/* Energy bar — memoised */}
      <EnergyBar pct={energyPct} />

      {/* ─── TAP ZONE ─── */}
      <div className="vt-tap-zone">
        {/* Canvas particle layer — sits behind coin, pointer-events:none */}
        <canvas
          ref={canvasRef}
          className="vt-particle-canvas"
          aria-hidden
        />

        {/* Floating gains */}
        <AnimatePresence>
          {floatingGains.map(g => (
            <motion.div
              key={g.id}
              className={cn("vt-gain", g.burst && "vt-gain--burst")}
              style={{ left: `${g.left}%`, top: `${g.top}%` }}
              initial={{ opacity: 1, y: 0, scale: 0.6 }}
              animate={{ opacity: 0, y: g.burst ? -80 : -55, scale: g.burst ? 1.35 : 1.1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: g.burst ? 1.1 : 0.9, ease: "easeOut" }}
            >
              {g.burst ? "🔥 " : "+"}{fmtFull(g.value)}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* The coin — 3D tilt + tapping scale */}
        <motion.button
          ref={coinRef}
          className={cn("vt-coin", tapping && "vt-coin--tapping")}
          onPointerDown={handleTap}
          onMouseMove={handleCoinMouseMove}
          onMouseLeave={handleCoinMouseLeave}
          whileTap={{ scale: 0.92 }}
          animate={{
            rotateX: coinTilt.x,
            rotateY: coinTilt.y,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          aria-label={S("اضغط لتكسب", "Tap to earn")}
          style={{ perspective: 800 }}
        >
          <span className="vt-coin-orbit-a" />
          <span className="vt-coin-orbit-b" />
          <span className="vt-coin-orbit-c" />
          <span className="vt-coin-orbit-d" />
          <span className="vt-coin-glow" />
          <span className="vt-coin-glow2" />

          <span className={cn("vt-coin-face", showTapIconImage && "vt-coin-face--image")}>
            {ripples.map(r => (
              <span
                key={r.id}
                className="vt-tap-ripple"
                style={{ left: `${r.x}%`, top: `${r.y}%` }}
              />
            ))}
            <span className="vt-coin-hex" />
            <span className="vt-coin-inner-ring" />
            <span className="vt-coin-inner-ring2" />
            <span className="vt-coin-eyes">
              <span className="vt-coin-eye" />
              <span className="vt-coin-eye" />
            </span>
            {showTapIconImage ? (
              <img
                src={tapIconValue}
                alt="tap-icon"
                className="vt-coin-custom-icon"
                onError={() => setTapIconBroken(true)}
              />
            ) : (
              <span className="vt-coin-monogram">{tapIconValue.slice(0, 4)}</span>
            )}
            <span className="vt-coin-hint">{S("اضغط!", "TAP!")}</span>
          </span>
        </motion.button>

        {/* Controls */}
        <div className="vt-tap-controls">
          <div className={cn("vt-live-pill", syncing && "vt-live-pill--syncing")}>
            <span className="vt-live-dot" />
            {syncing ? S("مزامنة", "Syncing") : S("مباشر", "Live")}
          </div>

          {/* Turbo button with charge arc */}
          <motion.button
            className={cn("vt-turbo-btn", turboSecs > 0 && "vt-turbo-btn--charging")}
            disabled={turboSecs > 0 || user.energy <= 0}
            onClick={handleTurbo}
            whileTap={{ scale: 0.88 }}
          >
            <Zap size={14} strokeWidth={2.5} />
            {turboSecs > 0
              ? <span className="vt-turbo-charge" style={{ "--pct": `${Math.round(100 - (turboSecs / (TURBO_COOLDOWN_MS / 1000)) * 100)}%` } as React.CSSProperties} />
              : null}
            {turboSecs > 0 ? `${turboSecs}${S("ث","s")}` : `×${TURBO_TAP_SIZE}`}
          </motion.button>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     UPGRADES
  ═══════════════════════════════════════════════════════════════════ */
  const upgradesScreen = (
    <div className="vt-panel">
      <div className="vt-panel-header">
        <div className="vt-panel-icon"><TrendingUp size={16} /></div>
        <h2 className="vt-panel-title">{S("مركز الترقيات","Upgrade Center")}</h2>
        <span className="vt-panel-sub">{filteredUpgrades.length} {S("متاح","available")}</span>
      </div>

      <div className="vt-chips-row">
        {upgCategories.map(cat => (
          <button
            key={cat}
            className={cn("vt-chip", upgFilter === cat && "vt-chip--active")}
            onClick={() => setUpgFilter(cat)}
          >
            {cat === "all" ? S("الكل","All") : cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="vt-upgrades-list">
        {filteredUpgrades.length === 0 && (
          <div className="vt-empty">
            <span className="vt-empty-icon">⚡</span>
            {S("لا توجد ترقيات.","No upgrades yet.")}
          </div>
        )}
        {filteredUpgrades.map((upg, i) => {
          const maxed  = upg.nextCost === null;
          const cost   = upg.nextCost ?? 0;
          const canBuy = !maxed && canAfford(cost, user.points);
          const locked = upg.unlockLevel > lvl;
          const pct    = Math.min(100, Math.round((upg.currentLevel / upg.maxLevel) * 100));
          const accent = categoryAccentColor(upg.category);
          return (
            <motion.div
              key={upg.id}
              className="vt-upg-card"
              style={{ "--upg-accent": accent } as React.CSSProperties}
              initial={{ opacity: 0, x: isRtl ? 14 : -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, ease: [0.22,1,0.36,1] }}
            >
              <div className="vt-upg-thumb">
                {upg.imageUrl
                  ? <img src={upg.imageUrl} alt={upg.titleEn} />
                  : <span className="vt-upg-emoji">{upg.icon || "⚡"}</span>}
              </div>
              <div className="vt-upg-body">
                <div className="vt-upg-row1">
                  <div>
                    <p className="vt-upg-name">{S(upg.titleAr, upg.titleEn)}</p>
                    <p className="vt-upg-cat">{upg.category.toUpperCase()}</p>
                  </div>
                  <span className="vt-upg-level-badge">{upg.currentLevel}/{upg.maxLevel}</span>
                </div>
                <p className="vt-upg-desc">{S(upg.descriptionAr, upg.descriptionEn)}</p>
                <div className="vt-upg-prog">
                  <motion.div
                    className="vt-upg-prog-fill"
                    style={{ background: accent }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.04 + 0.2 }}
                  />
                </div>
                <div className="vt-upg-boosts">
                  {[
                    { l: S("النقر","Tap"),    v: upg.tapBoost     },
                    { l: "PPH",              v: upg.pphBoost     },
                    { l: S("طاقة","Nrg"),    v: upg.energyBoost  },
                    { l: S("تلقائي","Auto"), v: upg.autoTapBoost },
                  ].map(b => (
                    <div key={b.l} className="vt-boost-pill">
                      <span>{b.l}</span>
                      <strong>+{b.v}</strong>
                    </div>
                  ))}
                </div>
                <div className="vt-upg-actions">
                  <button
                    className={cn("vt-btn vt-btn--primary", (!canBuy || locked || maxed) && "vt-btn--disabled")}
                    disabled={!canBuy || locked || maxed}
                    onClick={() => void buyUpgrade(upg.id)}
                  >
                    {maxed
                      ? S("✓ مكتمل","✓ Maxed")
                      : locked
                        ? `🔒 ${S("مستوى","Lv")} ${upg.unlockLevel}`
                        : `${S("ترقية","Upgrade")} · ${formatNumber(cost)}`}
                  </button>
                  {upg.starsPrice
                    ? <button className="vt-btn vt-btn--stars" onClick={() => void buyWithStars(upg)}><Star size={11} /> {upg.starsPrice}</button>
                    : <div className="vt-no-buy">—</div>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     TASKS
  ═══════════════════════════════════════════════════════════════════ */
  const tasksScreen = (
    <div className="vt-panel">
      <div className="vt-panel-header">
        <div className="vt-panel-icon" style={{ background:"rgba(6,182,212,0.09)", borderColor:"rgba(6,182,212,0.20)", color:"var(--c-400)" }}>
          <ListChecks size={16} />
        </div>
        <h2 className="vt-panel-title">{t("tasks.title")}</h2>
        <span className="vt-panel-sub" style={{ color:"var(--e-400)" }}>
          {tasks.filter(t => t.isClaimed).length}/{tasks.length}
        </span>
      </div>

      <div className="vt-chips-row">
        {(["all","DAILY","SOCIAL","CIPHER"] as const).map(f => (
          <button
            key={f}
            className={cn("vt-chip", taskFilter === f && "vt-chip--active")}
            onClick={() => setTaskFilter(f)}
          >
            {f === "all" ? S("الكل","All") : f}
          </button>
        ))}
      </div>

      <div className="vt-cipher-card">
        <div className="vt-cipher-title">
          <Sparkles size={14} style={{ color:"var(--g-400)" }} />
          {S("الشيفرة اليومية","Daily Cipher")}
        </div>
        <div className="vt-cipher-row">
          <input
            className="vt-input"
            placeholder={t("tasks.cipherPlaceholder")}
            value={cipherInput}
            onChange={e => setCipherInput(e.target.value)}
          />
          <button
            className="vt-btn vt-btn--ghost vt-btn--sm"
            style={{ flexShrink:0 }}
            onClick={() => setCipherInput(`VT-${new Date().toISOString().slice(8,10)}${new Date().toISOString().slice(5,7)}-CIPHER`)}
          >
            💡
          </button>
        </div>
        <p className="vt-cipher-hint">{t("tasks.dailyCipherHint")}</p>
      </div>

      <div className="vt-tasks-list">
        {filteredTasks.length === 0 && (
          <div className="vt-empty">
            <span className="vt-empty-icon">✅</span>
            {S("لا توجد مهام.","No tasks yet.")}
          </div>
        )}
        {filteredTasks.map((task, i) => (
          <motion.div
            key={task.id}
            className={cn("vt-task-row", task.isClaimed && "vt-task-row--done")}
            initial={{ opacity: 0, y: 9 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <div className="vt-task-info">
              <p className="vt-task-name">{S(task.titleAr, task.titleEn)}</p>
              <div className="vt-task-meta">
                <span className="vt-task-type">{task.type}</span>
                <span className="vt-task-reward">+{formatNumber(task.reward)}</span>
              </div>
            </div>
            <button
              className={cn("vt-btn vt-btn--sm", task.isClaimed ? "vt-btn--done" : "vt-btn--primary")}
              disabled={task.isClaimed}
              onClick={() => void claimTask(task)}
            >
              {task.isClaimed ? S("تم","Done") : t("tasks.claim")}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     FRIENDS
  ═══════════════════════════════════════════════════════════════════ */
  const friendsScreen = (
    <div className="vt-panel">
      <div className="vt-panel-header">
        <div className="vt-panel-icon" style={{ background:"rgba(139,92,246,0.09)", borderColor:"rgba(139,92,246,0.20)", color:"var(--v-400)" }}>
          <Users size={16} />
        </div>
        <h2 className="vt-panel-title">{t("referrals.title")}</h2>
      </div>

      <div className="vt-metrics-row">
        {[
          { emoji: "👥", val: String(referralStats?.level1Count ?? referral?.directReferrals ?? 0), lbl: t("referrals.level1") },
          { emoji: "🌐", val: String(referralStats?.level2Count ?? 0),                               lbl: t("referrals.level2") },
          { emoji: "🪙", val: formatNumber(referralStats?.estimatedRewards ?? 0),                    lbl: t("referrals.estimatedRewards") },
        ].map((m, i) => (
          <motion.div
            key={i}
            className="vt-metric-card"
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07 }}
          >
            <span className="vt-metric-emoji">{m.emoji}</span>
            <p className="vt-metric-val">{m.val}</p>
            <p className="vt-metric-lbl">{m.lbl}</p>
          </motion.div>
        ))}
      </div>

      <div className="vt-ref-card">
        <p className="vt-sec-label">{t("referrals.code")}</p>
        <div className="vt-code-row">
          <span className="vt-ref-code">{referral?.referralCode ?? "—"}</span>
          <button className="vt-btn vt-btn--ghost vt-btn--sm" onClick={copyCode}>
            {codeCopied ? S("تم ✓","Done ✓") : S("نسخ","Copy")}
          </button>
        </div>
        <p className="vt-ref-note">
          {S("مكافأة: 1000 نقطة لك + 1000 لصديقك 🎁","Reward: 1000 pts for you + 1000 for friend 🎁")}
        </p>
        <div className="vt-ref-btns">
          <button className="vt-btn vt-btn--primary" onClick={shareLink}>{S("مشاركة","Share")}</button>
          <button className="vt-btn vt-btn--ghost"   onClick={copyLink}>{S("نسخ الرابط","Copy Link")}</button>
        </div>
        {referralLink && <p className="vt-ref-link">{referralLink}</p>}
      </div>

      <div className="vt-steps-card">
        <p className="vt-sec-label">{S("كيف تعمل؟","How it works")}</p>
        {[
          S("انسخ رابط الدعوة وأرسله لأصدقائك.", "Copy your invite link and share it."),
          S("صديقك يفتح البوت من رابطك.", "Your friend opens the bot via your link."),
          S("1000 نقطة لكل طرف تلقائياً!", "1000 points auto-credited to both sides!"),
        ].map((step, i) => (
          <div key={i} className="vt-step">
            <span className="vt-step-num">{i + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      {(referralStats?.referrals?.length ?? 0) > 0 && (
        <div className="vt-friends-list-card">
          <p className="vt-sec-label">{S("أفضل الأصدقاء","Top Friends")}</p>
          {(referralStats?.referrals ?? []).slice(0, 8).map((f, i) => (
            <motion.div
              key={f.id}
              className="vt-friend-item"
              initial={{ opacity: 0, x: isRtl ? 9 : -9 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="vt-friend-rank">#{i+1}</span>
              <span className="vt-friend-name">{f.name}</span>
              <span className="vt-friend-pts">{formatNumber(f.points)}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     LEADERBOARD
  ═══════════════════════════════════════════════════════════════════ */
  const leaderboardScreen = (
    <div className="vt-panel">
      <div className="vt-panel-header">
        <div className="vt-panel-icon" style={{ background:"var(--g-dim)", borderColor:"var(--b-g)", color:"var(--g-400)" }}>
          <Trophy size={16} />
        </div>
        <h2 className="vt-panel-title">{t("leaderboard.title")}</h2>
      </div>

      <div className="vt-chips-row">
        {(["global","weekly","friends"] as BoardType[]).map(type => (
          <button
            key={type}
            className={cn("vt-chip", boardType === type && "vt-chip--active")}
            onClick={() => setBoardType(type)}
          >
            {t(`leaderboard.${type}`)}
          </button>
        ))}
      </div>

      {leaderboard.length >= 3 && (
        <div className="vt-podium">
          {[
            { item: leaderboard[1], cls:"vt-pod--2", plinth:"vt-pod-plinth--2", medal:"🥈", delay:0.11 },
            { item: leaderboard[0], cls:"vt-pod--1", plinth:"vt-pod-plinth--1", medal:"🥇", delay:0.03, crown:true },
            { item: leaderboard[2], cls:"vt-pod--3", plinth:"vt-pod-plinth--3", medal:"🥉", delay:0.17 },
          ].map(({ item, cls, plinth, medal, delay, crown }) => (
            <motion.div
              key={item?.id}
              className={cn("vt-pod", cls)}
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay }}
            >
              {crown && <div className="vt-pod-crown">👑</div>}
              <div className="vt-pod-medal">{medal}</div>
              <p className="vt-pod-name">{item?.name ?? "-"}</p>
              <p className="vt-pod-pts">{formatNumber(item?.points ?? 0)}</p>
              <div className={cn("vt-pod-plinth", plinth)} />
            </motion.div>
          ))}
        </div>
      )}

      <div className="vt-lb-list">
        {leaderboard.slice(3).map((item, i) => (
          <motion.div
            key={`${item.id}-${item.rank}`}
            className="vt-lb-row"
            initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.028 }}
          >
            <span className="vt-lb-rank">#{item.rank}</span>
            <span className="vt-lb-name">{item.name}</span>
            <span className="vt-lb-pts">{formatNumber(item.points)}</span>
          </motion.div>
        ))}
        {leaderboard.length === 0 && (
          <div className="vt-empty">
            <span className="vt-empty-icon">🏆</span>
            {S("لا توجد بيانات بعد.","No data yet.")}
          </div>
        )}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     SETTINGS CONTENT
  ═══════════════════════════════════════════════════════════════════ */
  const settingsContent = (
    <div className="vt-sett-sections">
      <div className="vt-sett-card">
        <div className="vt-sett-header">
          <div className="vt-sett-header-icon"><Globe size={14} /></div>
          <div>
            <p className="vt-sett-title">{S("اللغة","Language")}</p>
            <p className="vt-sett-desc">{S("تغيير لغة التطبيق","Change app language")}</p>
          </div>
        </div>
        <select
          className="vt-select"
          value={i18n.language}
          onChange={e => void i18n.changeLanguage(e.target.value)}
        >
          {SUPPORTED_LANGS.map(l => (
            <option key={l} value={l}>{l.toUpperCase()}</option>
          ))}
        </select>
      </div>

      <div className="vt-sett-card">
        <div className="vt-sett-header">
          <div className="vt-sett-header-icon"><Wallet size={14} /></div>
          <div>
            <p className="vt-sett-title">{S("المحفظة","Wallet")}</p>
            <p className="vt-sett-desc">{S("ربط TON والأيردروب","Connect TON & airdrop")}</p>
          </div>
        </div>
        <div className="vt-sett-group">
          <Suspense fallback={<div className="vt-loader-row">{S("جاري التحميل...","Loading...")}</div>}>
            <TonWalletLazy className="!w-full" manifestUrl={tonManifestUrl} />
          </Suspense>
          <input
            className="vt-input"
            placeholder={t("wallet.placeholder")}
            value={walletAddress}
            onChange={e => setWalletAddress(e.target.value)}
          />
          <button className="vt-btn vt-btn--gold vt-btn--full vt-btn--lg" onClick={() => void claimAirdrop()}>
            {t("wallet.claim")}
          </button>
          <p className="vt-sett-note">
            {t("wallet.estimated")}: ~{formatNumber(Math.floor(numericFromStr(user.points) / 1000))} JETTON
          </p>
        </div>
      </div>

      <div className="vt-sett-card">
        <div className="vt-sett-header">
          <div className="vt-sett-header-icon"><Bot size={14} /></div>
          <div>
            <p className="vt-sett-title">{S("الحساب","Account")}</p>
            <p className="vt-sett-desc">{S("معلومات حسابك","Your account info")}</p>
          </div>
        </div>
        <div className="vt-mini-grid">
          {[
            { l: S("الاسم","Name"),    v: displayName,                        i: <Crown size={10} />    },
            { l: S("الحالة","Status"), v: t("common.connected"),               i: <Sparkles size={10} /> },
            { l: S("النقاط","Points"), v: formatNumber(user.points),           i: <Coins size={10} />    },
            { l: S("النجوم","Stars"),  v: formatNumber(user.starsSpent ?? 0),  i: <Star size={10} />     },
          ].map(m => (
            <div key={m.l} className="vt-mini-card">
              <div className="vt-mini-head">{m.i}<span>{m.l}</span></div>
              <p className="vt-mini-val">{m.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats summary in settings */}
      <div className="vt-sett-card">
        <div className="vt-sett-header">
          <div className="vt-sett-header-icon"><Award size={14} /></div>
          <div>
            <p className="vt-sett-title">{S("إنجازاتك","Your Stats")}</p>
            <p className="vt-sett-desc">{S("ملخص الأداء","Performance summary")}</p>
          </div>
        </div>
        <div className="vt-mini-grid">
          {[
            { l: S("المستوى","Level"),   v: String(lvl)                              },
            { l: "PPH",                  v: formatNumber(user.pph)                   },
            { l: S("الطاقة","Energy"),   v: `${user.energy}/${user.maxEnergy}`       },
            { l: S("التابز","Total Tap"), v: formatNumber(user.totalTaps)            },
          ].map(m => (
            <div key={m.l} className="vt-mini-card">
              <div className="vt-mini-head"><ChevronUp size={10} /><span>{m.l}</span></div>
              <p className="vt-mini-val">{m.v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="vt-info-note">
        <Sparkles size={12} style={{ flexShrink:0, marginTop:1, color:"var(--g-400)" }} />
        <span>{S("شراء النجوم يتم مباشرة من بطاقة الترقية.","Stars purchases are made directly from upgrade cards.")}</span>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     SCREEN MAP
  ═══════════════════════════════════════════════════════════════════ */
  const screenMap: Record<ActiveTab, React.ReactNode> = {
    home:        homeScreen,
    upgrades:    upgradesScreen,
    tasks:       tasksScreen,
    friends:     friendsScreen,
    leaderboard: leaderboardScreen,
  };

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="vt-shell">
      {/* Achievement popups — fixed top */}
      <AchievementToast items={achievements} onDone={dismissAchievement} />

      {/* Background */}
      <div className="vt-bg" aria-hidden>
        <div className="vt-bg-blob vt-bg-blob--gold" />
        <div className="vt-bg-blob vt-bg-blob--teal" />
        <div className="vt-bg-blob vt-bg-blob--violet" />
        <div className="vt-bg-blob vt-bg-blob--rose" />
        <div className="vt-bg-grid" />
        <div className="vt-bg-vignette" />
      </div>

      {/* Screens */}
      <AnimatePresence mode="wait" initial={false} custom={tabDir}>
        <motion.div
          key={activeTab}
          className="vt-content"
          custom={tabDir}
          variants={screenVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={SCREEN_TRANSITION}
        >
          {screenMap[activeTab]}
        </motion.div>
      </AnimatePresence>

      {/* ── Bottom Nav ── */}
      <nav className="vt-nav" role="navigation" aria-label={S("القائمة الرئيسية","Main navigation")}>
        <div className="vt-nav-inner">
          <motion.div
            className="vt-nav-pill"
            layout layoutId="nav-pill"
            style={{
              width: `${100 / NAV_ITEMS.length}%`,
              left:  `${(navActiveIdx * 100) / NAV_ITEMS.length}%`,
            }}
            transition={{ type:"spring", stiffness:520, damping:42, mass:0.24 }}
          />

          {NAV_ITEMS.map(item => {
            const active = activeTab === item.key;
            const Icon   = item.icon;
            return (
              <motion.button
                key={item.key}
                className={cn("vt-nav-item", active && "vt-nav-item--active")}
                onClick={() => changeTab(item.key)}
                whileTap={{ scale: 0.78 }}
                aria-label={isRtl ? item.labelAr : item.labelEn}
                aria-current={active ? "page" : undefined}
              >
                <motion.span
                  className="vt-nav-icon"
                  animate={active ? { y: -2.5, scale: 1.14 } : { y: 0, scale: 1 }}
                  transition={{ type:"spring", stiffness:440, damping:26 }}
                >
                  <span className="vt-nav-icon-glow" />
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.7} />
                </motion.span>
                <motion.span
                  className="vt-nav-label"
                  animate={{ opacity: active ? 1 : 0.42 }}
                  transition={{ duration: 0.14 }}
                >
                  {isRtl ? item.labelAr : item.labelEn}
                </motion.span>
              </motion.button>
            );
          })}
        </div>
        <div className="vt-nav-safe" />
      </nav>

      {/* ── Settings Drawer ── */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.button
              type="button"
              aria-label={S("إغلاق","Close settings")}
              className="vt-overlay"
              onClick={() => setSettingsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="vt-drawer"
              role="dialog"
              aria-label={S("الإعدادات","Settings")}
              aria-modal
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type:"spring", stiffness:400, damping:36, mass:0.48 }}
            >
              <div className="vt-drawer-handle" />
              <div className="vt-drawer-header">
                <p className="vt-drawer-title">{S("الإعدادات","Settings")}</p>
                <button className="vt-drawer-close" onClick={() => setSettingsOpen(false)}>✕</button>
              </div>
              <div className="vt-drawer-scroll">{settingsContent}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
