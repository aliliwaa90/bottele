import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
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
import { getTelegramInitData, getTelegramUser, initTelegram, isTelegramWebApp } from "@/lib/telegram";
import { formatNumber } from "@/lib/utils";
const RTL_LANGS = new Set(["ar", "fa"]);
const SUPPORTED_LANGS = ["ar", "en", "ru", "tr", "es", "fa", "id"];
function playTapSound() {
    const AudioContextClass = window.AudioContext ||
        (window.webkitAudioContext ??
            null);
    if (!AudioContextClass)
        return;
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
    const [user, setUser] = useState(null);
    const [upgrades, setUpgrades] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [leaderboardType, setLeaderboardType] = useState("global");
    const [referral, setReferral] = useState(null);
    const [referralStats, setReferralStats] = useState(null);
    const [activeEvents, setActiveEvents] = useState([]);
    const [cipherInput, setCipherInput] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [tapAnimating, setTapAnimating] = useState(false);
    const [floatingGains, setFloatingGains] = useState([]);
    const energyPercent = useMemo(() => {
        if (!user || user.maxEnergy === 0)
            return 0;
        return Math.round((user.energy / user.maxEnergy) * 100);
    }, [user]);
    async function refreshBaseData(currentBoardType) {
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
                const socket = connectSocket(login.token);
                socket.on("user:update", (payload) => {
                    if (!mounted)
                        return;
                    setUser(payload);
                });
                socket.on("leaderboard:update", (payload) => {
                    if (!mounted || leaderboardType !== "global")
                        return;
                    setLeaderboard(payload);
                });
                socket.on("mass:notification", (payload) => {
                    toast.info(payload.title, { description: payload.body });
                });
                await refreshBaseData(leaderboardType);
                if (SUPPORTED_LANGS.includes(login.user.language)) {
                    await i18n.changeLanguage(login.user.language);
                }
                else {
                    await i18n.changeLanguage("ar");
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : t("common.error");
                toast.error(message);
            }
            finally {
                if (mounted)
                    setLoading(false);
            }
        };
        void init();
        return () => {
            mounted = false;
            disconnectSocket();
        };
    }, []);
    useEffect(() => {
        if (!user)
            return;
        void api.leaderboard(leaderboardType).then(setLeaderboard).catch(() => undefined);
    }, [leaderboardType, user?.id]);
    useEffect(() => {
        document.documentElement.lang = i18n.language;
        document.documentElement.dir = RTL_LANGS.has(i18n.language) ? "rtl" : "ltr";
    }, [i18n.language]);
    const addFloatingGain = (value) => {
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
        if (!user)
            return;
        if (user.energy <= 0) {
            toast.warning(t("tap.energyLow"));
            return;
        }
        try {
            setTapAnimating(true);
            playTapSound();
            try {
                WebApp.HapticFeedback.impactOccurred("light");
            }
            catch {
                // Ignore haptic issues outside Telegram clients.
            }
            const response = await api.tap(1);
            setUser(response.user);
            addFloatingGain(response.pointsEarned);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : t("common.error"));
        }
        finally {
            setTimeout(() => setTapAnimating(false), 180);
        }
    };
    const handleBuyUpgrade = async (upgradeId) => {
        try {
            const result = await api.buyUpgrade(upgradeId);
            setUser(result.user);
            const gameState = await api.gameMe();
            setUpgrades(gameState.upgrades);
            toast.success(result.message);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : t("common.error"));
        }
    };
    const handleClaimTask = async (task) => {
        try {
            const result = await api.claimTask(task.id, task.type === "CIPHER" ? cipherInput : undefined);
            toast.success(`${result.message} +${result.reward}`);
            const [taskState, gameState] = await Promise.all([api.getTasks(), api.gameMe()]);
            setTasks(taskState.tasks);
            setUser(gameState.user);
            setCipherInput("");
        }
        catch (error) {
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
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : t("common.error"));
        }
    };
    if (loading) {
        return (_jsx("div", { className: "mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4", children: _jsx(Card, { className: "w-full max-w-md", children: _jsx(CardContent, { className: "p-6 text-center text-lg font-semibold", children: t("common.loading") }) }) }));
    }
    if (outsideTelegram) {
        return (_jsx("div", { className: "mx-auto flex min-h-screen max-w-xl items-center justify-center px-4", children: _jsxs(Card, { className: "w-full border-amber-400/50 bg-card/90", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2 text-amber-300", children: [_jsx(ShieldCheck, { size: 18 }), "VaultTap Security Shield"] }) }), _jsxs(CardContent, { className: "space-y-2 text-sm", children: [_jsx("p", { children: "\u0647\u0630\u0647 \u0627\u0644\u0648\u0627\u062C\u0647\u0629 \u062A\u0639\u0645\u0644 \u0645\u0646 \u062F\u0627\u062E\u0644 Telegram \u0641\u0642\u0637 \u0644\u062D\u0645\u0627\u064A\u0629 \u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646." }), _jsxs("p", { className: "text-muted-foreground", children: ["\u0627\u0641\u062A\u062D \u0627\u0644\u0628\u0648\u062A \u062B\u0645 \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0632\u0631 ", _jsx("strong", { children: "\u0641\u062A\u062D VaultTap Mini App" }), "."] })] })] }) }));
    }
    if (!user) {
        return (_jsx("div", { className: "mx-auto flex min-h-screen max-w-xl items-center justify-center px-4", children: _jsx(Card, { className: "w-full", children: _jsx(CardContent, { className: "p-6 text-center", children: t("common.error") }) }) }));
    }
    return (_jsx("div", { className: "mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-6", children: _jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, className: "space-y-4", children: [_jsx(Card, { className: "border-yellow-300/20 bg-gradient-to-br from-slate-950/80 to-slate-900/70", children: _jsxs(CardHeader, { className: "space-y-3", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsxs(CardTitle, { className: "flex items-center gap-2 text-2xl", children: [_jsx(Crown, { size: 22, className: "text-yellow-300" }), t("app.title")] }), _jsx("p", { className: "text-sm text-muted-foreground", children: t("app.subtitle") })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { variant: "secondary", children: t("common.connected") }), _jsx("select", { className: "h-9 rounded-lg border border-border bg-background px-2 text-sm", value: i18n.language, onChange: (e) => void i18n.changeLanguage(e.target.value), children: SUPPORTED_LANGS.map((lang) => (_jsx("option", { value: lang, children: lang.toUpperCase() }, lang))) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 md:grid-cols-4", children: [_jsx(StatCard, { label: t("stats.points"), value: formatNumber(user.points), icon: _jsx(Sparkles, { size: 14 }) }), _jsx(StatCard, { label: t("stats.energy"), value: `${user.energy}/${user.maxEnergy}`, icon: _jsx(Zap, { size: 14 }) }), _jsx(StatCard, { label: t("stats.combo"), value: `${user.comboMultiplier.toFixed(2)}x`, icon: _jsx(Flame, { size: 14 }) }), _jsx(StatCard, { label: t("stats.pph"), value: formatNumber(user.pph), icon: _jsx(Gift, { size: 14 }) })] }), _jsx(Progress, { value: energyPercent }), activeEvents.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-2", children: activeEvents.map((event) => (_jsxs(Badge, { children: [t("events.activeBooster"), ":", " ", (i18n.language === "ar" ? event.nameAr : event.nameEn) || event.nameAr, " x", event.multiplier] }, event.id))) })) : null] }) }), _jsxs(Tabs, { defaultValue: "tap", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "tap", children: t("tabs.tap") }), _jsx(TabsTrigger, { value: "upgrades", children: t("tabs.upgrades") }), _jsx(TabsTrigger, { value: "tasks", children: t("tabs.tasks") }), _jsx(TabsTrigger, { value: "referrals", children: t("tabs.referrals") }), _jsx(TabsTrigger, { value: "leaderboard", children: t("tabs.leaderboard") }), _jsx(TabsTrigger, { value: "wallet", children: t("tabs.wallet") })] }), _jsx(TabsContent, { value: "tap", children: _jsx(Card, { children: _jsxs(CardContent, { className: "relative flex flex-col items-center gap-5 overflow-hidden p-6", children: [_jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,170,20,0.16),transparent_52%)]" }), floatingGains.map((gain) => (_jsxs(motion.div, { initial: { opacity: 1, y: 0 }, animate: { opacity: 0, y: -50 }, transition: { duration: 0.85 }, className: "pointer-events-none absolute z-20 text-sm font-bold text-yellow-300", style: { left: `${gain.left}%`, top: `${gain.top}%` }, children: ["+", gain.value] }, gain.id))), _jsxs(motion.button, { whileTap: { scale: 0.93 }, onClick: handleTap, className: `relative z-10 h-56 w-56 rounded-full border-4 border-yellow-200/80 bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 text-3xl shadow-[0_24px_80px_rgba(255,163,34,0.5)] ${tapAnimating ? "animate-pulseTap" : ""}`, children: [_jsx("span", { className: "absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.7),transparent_40%)]" }), _jsx("span", { className: "relative z-10 font-black text-slate-900", children: "\uD83D\uDC39" })] }), _jsxs("div", { className: "z-10 text-center", children: [_jsxs("p", { className: "text-sm text-muted-foreground", children: ["+", user.tapPower, " / tap | combo ", user.comboMultiplier.toFixed(2), "x"] }), _jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Tap-to-Earn Engine: VaultTap Core v1" })] })] }) }) }), _jsx(TabsContent, { value: "upgrades", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: t("upgrades.title") }) }), _jsx(CardContent, { className: "grid gap-3 md:grid-cols-2", children: upgrades.map((upgrade) => {
                                            const maxed = upgrade.nextCost === null;
                                            const cost = upgrade.nextCost ?? 0;
                                            const canBuy = !maxed && Number(user.points) >= cost;
                                            return (_jsxs("div", { className: "rounded-xl border border-border/70 bg-secondary/20 p-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-bold", children: i18n.language === "ar" ? upgrade.titleAr : upgrade.titleEn }), _jsx("p", { className: "text-xs text-muted-foreground", children: i18n.language === "ar"
                                                                            ? upgrade.descriptionAr
                                                                            : upgrade.descriptionEn })] }), _jsxs(Badge, { variant: "secondary", children: [t("upgrades.level"), " ", upgrade.currentLevel, "/", upgrade.maxLevel] })] }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2 text-xs", children: [upgrade.tapBoost > 0 ? (_jsxs(Badge, { variant: "outline", children: ["+", upgrade.tapBoost, " ", t("upgrades.boostTap")] })) : null, upgrade.pphBoost > 0 ? (_jsxs(Badge, { variant: "outline", children: ["+", upgrade.pphBoost, " ", t("upgrades.boostPph")] })) : null, upgrade.energyBoost > 0 ? (_jsxs(Badge, { variant: "outline", children: ["+", upgrade.energyBoost, " ", t("upgrades.boostEnergy")] })) : null] }), _jsxs("div", { className: "mt-3 flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-semibold", children: maxed
                                                                    ? t("upgrades.max")
                                                                    : `${t("upgrades.cost")}: ${formatNumber(cost)}` }), _jsx(Button, { size: "sm", disabled: !canBuy, onClick: () => void handleBuyUpgrade(upgrade.id), children: t("upgrades.buy") })] })] }, upgrade.id));
                                        }) })] }) }), _jsx(TabsContent, { value: "tasks", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: t("tasks.title") }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: t("tasks.cipherPlaceholder"), value: cipherInput, onChange: (event) => setCipherInput(event.target.value) }), _jsx(Button, { variant: "outline", onClick: () => setCipherInput("VT-" +
                                                            new Date().toISOString().slice(8, 10) +
                                                            new Date().toISOString().slice(5, 7) +
                                                            "-CIPHER"), children: "Hint" })] }), _jsx("p", { className: "text-xs text-muted-foreground", children: t("tasks.dailyCipherHint") }), _jsx(Separator, {}), _jsx("div", { className: "space-y-2", children: tasks.map((task) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border/50 p-3", children: [_jsxs("div", { children: [_jsx("div", { className: "font-semibold", children: i18n.language === "ar" ? task.titleAr : task.titleEn }), _jsxs("div", { className: "text-xs text-muted-foreground", children: ["+", formatNumber(task.reward), " | ", task.type] })] }), _jsx(Button, { size: "sm", variant: task.isClaimed ? "secondary" : "default", disabled: task.isClaimed, onClick: () => void handleClaimTask(task), children: task.isClaimed ? t("tasks.claimed") : t("tasks.claim") })] }, task.id))) })] })] }) }), _jsx(TabsContent, { value: "referrals", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: t("referrals.title") }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border/50 p-3", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: t("referrals.code") }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-bold", children: referral?.referralCode }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                                                                    navigator.clipboard.writeText(referral?.referralCode ?? "");
                                                                    toast.success("Copied");
                                                                }, children: "Copy" })] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-2 md:grid-cols-3", children: [_jsx(Metric, { label: t("referrals.level1"), value: String(referralStats?.level1Count ?? referral?.directReferrals ?? 0) }), _jsx(Metric, { label: t("referrals.level2"), value: String(referralStats?.level2Count ?? 0) }), _jsx(Metric, { label: t("referrals.estimatedRewards"), value: formatNumber(referralStats?.estimatedRewards ?? 0) })] })] })] }) }), _jsx(TabsContent, { value: "leaderboard", children: _jsxs(Card, { children: [_jsxs(CardHeader, { className: "space-y-3", children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Trophy, { size: 17 }), t("leaderboard.title")] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: leaderboardType === "global" ? "default" : "outline", onClick: () => setLeaderboardType("global"), children: t("leaderboard.global") }), _jsx(Button, { size: "sm", variant: leaderboardType === "weekly" ? "default" : "outline", onClick: () => setLeaderboardType("weekly"), children: t("leaderboard.weekly") }), _jsx(Button, { size: "sm", variant: leaderboardType === "friends" ? "default" : "outline", onClick: () => setLeaderboardType("friends"), children: t("leaderboard.friends") })] })] }), _jsx(CardContent, { className: "space-y-2", children: leaderboard.map((item) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border/50 p-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Badge, { children: item.rank }), _jsx("span", { className: "font-semibold", children: item.name })] }), _jsx("span", { className: "font-bold", children: formatNumber(item.points) })] }, `${item.id}-${item.rank}`))) })] }) }), _jsx(TabsContent, { value: "wallet", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: t("wallet.title") }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsx(TonConnectButton, { className: "!w-full" }), _jsxs("div", { className: "space-y-2", children: [_jsx(Input, { placeholder: t("wallet.placeholder"), value: walletAddress, onChange: (event) => setWalletAddress(event.target.value) }), _jsx(Button, { className: "w-full", onClick: () => void handleClaimAirdrop(), children: t("wallet.claim") })] }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [t("wallet.estimated"), ": ", formatNumber(Number(user.points) / 1000)] })] })] }) })] })] }) }));
}
function StatCard({ label, value, icon }) {
    return (_jsxs("div", { className: "rounded-xl border border-border/60 bg-secondary/40 p-3", children: [_jsxs("div", { className: "mb-1 flex items-center gap-1 text-xs text-muted-foreground", children: [icon, _jsx("span", { children: label })] }), _jsx("div", { className: "text-base font-bold", children: value })] }));
}
function Metric({ label, value }) {
    return (_jsxs("div", { className: "rounded-lg border border-border/50 bg-secondary/30 p-3 text-center", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: label }), _jsx("div", { className: "text-lg font-bold", children: value })] }));
}
