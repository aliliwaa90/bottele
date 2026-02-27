import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Crown, Flame, Gift, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TonConnectButton } from "@tonconnect/ui-react";
import { toast } from "sonner";
import WebApp from "@twa-dev/sdk";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import {
  getTelegramInitData,
  getTelegramUser,
  initTelegram,
  isTelegramWebApp
} from "@/lib/telegram";
import { formatNumber } from "@/lib/utils";
import type { LeaderboardItem, Task, Upgrade, User } from "@/types/api";

const RTL_LANGS = new Set(["ar", "fa"]);
const SUPPORTED_LANGS = ["ar", "en", "ru", "tr", "es", "fa", "id"] as const;
type BoardType = "global" | "weekly" | "friends";

type FloatingGain = { id: number; value: number; left: number; top: number };

function playTapSound() {
  const AudioContextClass =
    window.AudioContext ||
    ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
      null);
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = 400;
  gain.gain.setValueAtTime(0.11, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.1);
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [outsideTelegram, setOutsideTelegram] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<BoardType>("global");
  const [referral, setReferral] = useState<{ directReferrals: number; referralCode: string } | null>(
    null
  );
  const [referralStats, setReferralStats] = useState<{
    level1Count: number;
    level2Count: number;
    estimatedRewards: number;
  } | null>(null);
  const [activeEvents, setActiveEvents] = useState<
    Array<{ id: string; nameAr: string; nameEn: string; multiplier: number }>
  >([]);
  const [cipherInput, setCipherInput] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [tapAnimating, setTapAnimating] = useState(false);
  const [floatingGains, setFloatingGains] = useState<FloatingGain[]>([]);

  const energyPercent = useMemo(() => {
    if (!user || user.maxEnergy === 0) return 0;
    return Math.round((user.energy / user.maxEnergy) * 100);
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
        const fallbackId =
          localStorage.getItem("vaulttap-local-id") ?? String(Date.now()).slice(-10);
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
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    void api.leaderboard(leaderboardType).then(setLeaderboard).catch(() => undefined);
  }, [leaderboardType, user?.id]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = RTL_LANGS.has(i18n.language) ? "rtl" : "ltr";
  }, [i18n.language]);

  const addFloatingGain = (value: number) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const gain = {
      id,
      value,
      left: 44 + Math.random() * 20,
      top: 42 + Math.random() * 12
    };
    setFloatingGains((prev) => [...prev, gain]);
    window.setTimeout(() => {
      setFloatingGains((prev) => prev.filter((item) => item.id !== id));
    }, 900);
  };

  const handleTap = async () => {
    if (!user) return;
    if (user.energy <= 0) {
      toast.warning(t("tap.energyLow"));
      return;
    }
    try {
      setTapAnimating(true);
      playTapSound();
      try {
        WebApp.HapticFeedback.impactOccurred("light");
      } catch {
        // Ignore haptic issues outside Telegram clients.
      }
      const response = await api.tap(1);
      setUser(response.user);
      addFloatingGain(response.pointsEarned);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setTimeout(() => setTapAnimating(false), 180);
    }
  };

  const handleBuyUpgrade = async (upgradeId: string) => {
    try {
      const result = await api.buyUpgrade(upgradeId);
      setUser(result.user);
      const gameState = await api.gameMe();
      setUpgrades(gameState.upgrades);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  };

  const handleClaimTask = async (task: Task) => {
    try {
      const result = await api.claimTask(
        task.id,
        task.type === "CIPHER" ? cipherInput : undefined
      );
      toast.success(`${result.message} +${result.reward}`);
      const [taskState, gameState] = await Promise.all([api.getTasks(), api.gameMe()]);
      setTasks(taskState.tasks);
      setUser(gameState.user);
      setCipherInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  };

  const handleClaimAirdrop = async () => {
    if (!walletAddress) {
      toast.warning(t("wallet.placeholder"));
      return;
    }
    try {
      const result = await api.claimAirdrop(walletAddress.trim());
      toast.success(`${t("wallet.claim")} ${formatNumber(result.estimatedJetton)}`);
      setWalletAddress(result.walletAddress);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center text-lg font-semibold">
            {t("common.loading")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (outsideTelegram) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
        <Card className="w-full border-amber-400/50 bg-card/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-300">
              <ShieldCheck size={18} />
              VaultTap Security Shield
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>هذه الواجهة تعمل من داخل Telegram فقط لحماية حسابات اللاعبين.</p>
            <p className="text-muted-foreground">
              افتح البوت ثم اضغط على زر <strong>فتح VaultTap Mini App</strong>.
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
    <div className="mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="border-yellow-300/20 bg-gradient-to-br from-slate-950/80 to-slate-900/70">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Crown size={22} className="text-yellow-300" />
                  {t("app.title")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t("app.subtitle")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{t("common.connected")}</Badge>
                <select
                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                  value={i18n.language}
                  onChange={(e) => void i18n.changeLanguage(e.target.value)}
                >
                  {SUPPORTED_LANGS.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <StatCard label={t("stats.points")} value={formatNumber(user.points)} icon={<Sparkles size={14} />} />
              <StatCard label={t("stats.energy")} value={`${user.energy}/${user.maxEnergy}`} icon={<Zap size={14} />} />
              <StatCard label={t("stats.combo")} value={`${user.comboMultiplier.toFixed(2)}x`} icon={<Flame size={14} />} />
              <StatCard label={t("stats.pph")} value={formatNumber(user.pph)} icon={<Gift size={14} />} />
            </div>
            <Progress value={energyPercent} />
            {activeEvents.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeEvents.map((event) => (
                  <Badge key={event.id}>
                    {t("events.activeBooster")}:{" "}
                    {(i18n.language === "ar" ? event.nameAr : event.nameEn) || event.nameAr} x
                    {event.multiplier}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardHeader>
        </Card>

        <Tabs defaultValue="tap">
          <TabsList>
            <TabsTrigger value="tap">{t("tabs.tap")}</TabsTrigger>
            <TabsTrigger value="upgrades">{t("tabs.upgrades")}</TabsTrigger>
            <TabsTrigger value="tasks">{t("tabs.tasks")}</TabsTrigger>
            <TabsTrigger value="referrals">{t("tabs.referrals")}</TabsTrigger>
            <TabsTrigger value="leaderboard">{t("tabs.leaderboard")}</TabsTrigger>
            <TabsTrigger value="wallet">{t("tabs.wallet")}</TabsTrigger>
          </TabsList>

          <TabsContent value="tap">
            <Card>
              <CardContent className="relative flex flex-col items-center gap-5 overflow-hidden p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,170,20,0.16),transparent_52%)]" />
                {floatingGains.map((gain) => (
                  <motion.div
                    key={gain.id}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -50 }}
                    transition={{ duration: 0.85 }}
                    className="pointer-events-none absolute z-20 text-sm font-bold text-yellow-300"
                    style={{ left: `${gain.left}%`, top: `${gain.top}%` }}
                  >
                    +{gain.value}
                  </motion.div>
                ))}
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={handleTap}
                  className={`relative z-10 h-56 w-56 rounded-full border-4 border-yellow-200/80 bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 text-3xl shadow-[0_24px_80px_rgba(255,163,34,0.5)] ${tapAnimating ? "animate-pulseTap" : ""}`}
                >
                  <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.7),transparent_40%)]" />
                  <span className="relative z-10 font-black text-slate-900">🐹</span>
                </motion.button>
                <div className="z-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    +{user.tapPower} / tap | combo {user.comboMultiplier.toFixed(2)}x
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Tap-to-Earn Engine: VaultTap Core v1</p>
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
                  return (
                    <div key={upgrade.id} className="rounded-xl border border-border/70 bg-secondary/20 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold">
                            {i18n.language === "ar" ? upgrade.titleAr : upgrade.titleEn}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {i18n.language === "ar"
                              ? upgrade.descriptionAr
                              : upgrade.descriptionEn}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {t("upgrades.level")} {upgrade.currentLevel}/{upgrade.maxLevel}
                        </Badge>
                      </div>
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
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {maxed
                            ? t("upgrades.max")
                            : `${t("upgrades.cost")}: ${formatNumber(cost)}`}
                        </span>
                        <Button
                          size="sm"
                          disabled={!canBuy}
                          onClick={() => void handleBuyUpgrade(upgrade.id)}
                        >
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
                        "VT-" +
                          new Date().toISOString().slice(8, 10) +
                          new Date().toISOString().slice(5, 7) +
                          "-CIPHER"
                      )
                    }
                  >
                    Hint
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t("tasks.dailyCipherHint")}</p>
                <Separator />
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                    >
                      <div>
                        <div className="font-semibold">
                          {i18n.language === "ar" ? task.titleAr : task.titleEn}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          +{formatNumber(task.reward)} | {task.type}
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
                <CardTitle>{t("referrals.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <span className="text-sm text-muted-foreground">{t("referrals.code")}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{referral?.referralCode}</span>
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
                <div className="flex gap-2">
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
                    className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge>{item.rank}</Badge>
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
                <CardTitle>{t("wallet.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TonConnectButton className="!w-full" />
                <div className="space-y-2">
                  <Input
                    placeholder={t("wallet.placeholder")}
                    value={walletAddress}
                    onChange={(event) => setWalletAddress(event.target.value)}
                  />
                  <Button className="w-full" onClick={() => void handleClaimAirdrop()}>
                    {t("wallet.claim")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("wallet.estimated")}: {formatNumber(Number(user.points) / 1000)}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/40 p-3">
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
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
