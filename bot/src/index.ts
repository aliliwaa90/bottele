import { Bot, InlineKeyboard } from "grammy";

import { env } from "./config/env.js";
import {
  claimTask,
  confirmStarsPayment,
  getGameState,
  getLeaderboard,
  getProfile,
  getReferrals,
  getTasks,
  loginWithTelegram,
  type TelegramUserPayload
} from "./services/backend.js";

type Lang = "ar" | "en" | "ru" | "tr" | "es" | "fa" | "id";
const LANGS: Lang[] = ["ar", "en", "ru", "tr", "es", "fa", "id"];

const DEFAULT_LANG: Lang = LANGS.includes(env.DEFAULT_LANGUAGE as Lang)
  ? (env.DEFAULT_LANGUAGE as Lang)
  : "ar";

const enText = {
  welcome:
    "Welcome to VaultTap!\\nTap, upgrade, complete tasks, and grow your balance faster every day.",
  menuHint: "Quick actions are ready below. Open the mini app and start now.",
  openApp: "🚀 Open VaultTap Mini App",
  profile: "👤 Profile",
  leaderboard: "🏆 Leaderboard",
  tasks: "✅ Tasks",
  referrals: "👥 Referrals",
  starsShop: "⭐ Stars Shop",
  language: "🌐 Language",
  helpButton: "❓ Help",
  chooseLanguage: "Choose language:",
  profileTitle: "Your current stats",
  globalTop: "Top 10 players",
  topEmpty: "No leaderboard data yet.",
  tasksTitle: "Tasks list",
  noTasks: "No tasks available right now.",
  claimDaily: "Claim daily task",
  claimed: "Claimed",
  referralsTitle: "Referral stats",
  pointsLabel: "Points",
  energyLabel: "Energy",
  comboLabel: "Combo",
  pphLabel: "PPH",
  autoTapLabel: "Auto Tap/H",
  tapPowerLabel: "Tap Power",
  totalTapsLabel: "Total Taps",
  referralCodeLabel: "Referral Code",
  level1Label: "Level 1",
  level2Label: "Level 2",
  estimatedRewardsLabel: "Estimated Rewards",
  starsTitle: "Stars upgrades",
  starsEmpty: "No star upgrades available now.",
  buyStars: "Buy with Stars",
  starsPurchased: "Stars payment confirmed and reward applied.",
  paymentFailed: "Payment verification failed, please contact support.",
  loginSetupError:
    "Bot login failed due to server config. Check backend settings and redeploy backend + bot.",
  serverDownError: "Server is not responding. Try again in a moment.",
  invalidTask: "Invalid task.",
  actionFailed: "Action failed.",
  help:
    "Commands:\\n/start Start bot\\n/menu Main menu\\n/profile Your stats\\n/top Leaderboard\\n/tasks Tasks\\n/ref Referrals\\n/stars Stars shop\\n/lang Change language",
  fastStartReady: "Ready. Your account is being prepared in the background.",
  error: "Something went wrong. Try again."
};

type TextKey = keyof typeof enText;
type BotText = Record<TextKey, string>;

const text: Record<Lang, BotText> = {
  ar: {
    welcome:
      "هلا وسهلا بك في VaultTap 🚀\\nاضغط وطور حسابك وأنجز المهام واجمع النقاط بسرعة أكبر كل يوم.",
    menuHint: "الأزرار السريعة جاهزة بالأسفل. افتح الميني آب وابدأ اللعب الآن.",
    openApp: "🚀 فتح تطبيق VaultTap",
    profile: "👤 ملفي",
    leaderboard: "🏆 الصدارة",
    tasks: "✅ المهام",
    referrals: "👥 الإحالات",
    starsShop: "⭐ متجر النجوم",
    language: "🌐 اللغة",
    helpButton: "❓ مساعدة",
    chooseLanguage: "اختر اللغة:",
    profileTitle: "إحصائياتك الحالية",
    globalTop: "أفضل 10 لاعبين",
    topEmpty: "لا توجد بيانات صدارة حتى الآن.",
    tasksTitle: "قائمة المهام",
    noTasks: "لا توجد مهام متاحة الآن.",
    claimDaily: "تحصيل المهمة اليومية",
    claimed: "تم التحصيل",
    referralsTitle: "إحصائيات الإحالات",
    pointsLabel: "النقاط",
    energyLabel: "الطاقة",
    comboLabel: "الكومبو",
    pphLabel: "الربح بالساعة",
    autoTapLabel: "النقر التلقائي/ساعة",
    tapPowerLabel: "قوة النقر",
    totalTapsLabel: "إجمالي النقرات",
    referralCodeLabel: "كود الإحالة",
    level1Label: "المستوى الأول",
    level2Label: "المستوى الثاني",
    estimatedRewardsLabel: "المكافآت التقديرية",
    starsTitle: "ترقيات النجوم",
    starsEmpty: "لا توجد ترقيات نجوم متاحة الآن.",
    buyStars: "شراء بالنجوم",
    starsPurchased: "تم تأكيد الدفع بالنجوم وتطبيق المكافأة.",
    paymentFailed: "تعذر تأكيد الدفع، تواصل مع الدعم.",
    loginSetupError:
      "تعذر تسجيل الدخول من البوت. تحقق من إعدادات الخادم ثم أعد نشر backend و bot.",
    serverDownError: "الخادم لا يستجيب الآن، حاول مرة أخرى بعد قليل.",
    invalidTask: "معرّف المهمة غير صالح.",
    actionFailed: "فشلت العملية.",
    help:
      "الأوامر:\\n/start تشغيل البوت\\n/menu القائمة الرئيسية\\n/profile ملفك\\n/top الصدارة\\n/tasks المهام\\n/ref الإحالات\\n/stars متجر النجوم\\n/lang تغيير اللغة",
    fastStartReady: "تم التجهيز. يتم تهيئة حسابك بالخلفية.",
    error: "حدث خطأ، حاول مرة أخرى."
  },
  en: enText,
  ru: enText,
  tr: enText,
  es: enText,
  fa: enText,
  id: enText
};

const userLangStore = new Map<number, Lang>();

function detectLang(code?: string): Lang {
  if (!code) return DEFAULT_LANG;
  const direct = code.toLowerCase().slice(0, 2) as Lang;
  if (LANGS.includes(direct)) return direct;
  return DEFAULT_LANG;
}

function t(userId: number, key: TextKey): string {
  const lang = userLangStore.get(userId) ?? DEFAULT_LANG;
  return text[lang][key];
}

function mainMenu(userId: number) {
  return new InlineKeyboard()
    .webApp(t(userId, "openApp"), env.TELEGRAM_WEBAPP_URL)
    .row()
    .text(t(userId, "profile"), "profile")
    .text(t(userId, "tasks"), "tasks")
    .text(t(userId, "leaderboard"), "leaderboard")
    .row()
    .text(t(userId, "referrals"), "referrals")
    .text(t(userId, "starsShop"), "stars")
    .row()
    .text(t(userId, "language"), "language")
    .text(t(userId, "helpButton"), "help");
}

function langMenu() {
  const keyboard = new InlineKeyboard();
  LANGS.forEach((lang, index) => {
    keyboard.text(lang.toUpperCase(), `lang:${lang}`);
    if ((index + 1) % 4 === 0) keyboard.row();
  });
  return keyboard;
}

function humanError(userId: number, error: unknown): string {
  if (!(error instanceof Error)) return t(userId, "error");
  const message = error.message;

  if (message.includes("Telegram initData is required for login")) {
    return t(userId, "loginSetupError");
  }
  if (message.includes("Invalid Telegram initData")) {
    return t(userId, "loginSetupError");
  }
  if (message.includes("fetch failed") || message.includes("Failed to fetch")) {
    return t(userId, "serverDownError");
  }
  if (message.includes("backend timeout")) {
    return t(userId, "serverDownError");
  }

  return message || t(userId, "error");
}

function welcomeMessage(userId: number): string {
  return `${t(userId, "welcome")}\\n\\n${t(userId, "menuHint")}`;
}

function rankPrefix(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}.`;
}

const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

async function sendProfile(user: TelegramUserPayload, reply: (message: string) => Promise<unknown>) {
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  const data = await getProfile(user);
  await reply(
    `📊 ${t(user.id, "profileTitle")}\\n` +
      `• ${t(user.id, "pointsLabel")}: ${data.user.points}\\n` +
      `• ${t(user.id, "energyLabel")}: ${data.user.energy}/${data.user.maxEnergy}\\n` +
      `• ${t(user.id, "comboLabel")}: x${data.user.comboMultiplier.toFixed(2)}\\n` +
      `• ${t(user.id, "pphLabel")}: ${data.user.pph}\\n` +
      `• ${t(user.id, "autoTapLabel")}: ${data.user.autoTapPerHour}\\n` +
      `• ${t(user.id, "tapPowerLabel")}: ${data.user.tapPower}\\n` +
      `• ${t(user.id, "totalTapsLabel")}: ${data.user.totalTaps}\\n` +
      `• ${t(user.id, "referralCodeLabel")}: ${data.user.referralCode}`
  );
}

async function sendTop(user: TelegramUserPayload, reply: (message: string) => Promise<unknown>) {
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  const top = await getLeaderboard("global", user);
  if (top.length === 0) {
    await reply(t(user.id, "topEmpty"));
    return;
  }
  const rows = top.map((item) => `${rankPrefix(item.rank)} ${item.name} — ${item.points}`).join("\\n");
  await reply(`🏆 ${t(user.id, "globalTop")}\\n${rows}`);
}

async function sendTasks(user: TelegramUserPayload, reply: (message: string, keyboard?: InlineKeyboard) => Promise<unknown>) {
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  const lang = userLangStore.get(user.id) ?? DEFAULT_LANG;
  const data = await getTasks(user);
  if (data.tasks.length === 0) {
    await reply(t(user.id, "noTasks"));
    return;
  }

  const lines = data.tasks.slice(0, 8).map((task) => {
    const title = lang === "ar" ? task.titleAr : task.titleEn;
    const status = task.isClaimed ? `✅ ${t(user.id, "claimed")}` : "⏳";
    return `${status} ${title} (+${task.reward})`;
  });

  const daily = data.tasks.find((task) => task.key === "daily_check_in" && !task.isClaimed);
  const keyboard = daily
    ? new InlineKeyboard().text(t(user.id, "claimDaily"), `claim:${daily.id}`)
    : undefined;

  await reply(`🎯 ${t(user.id, "tasksTitle")}\\n${lines.join("\\n")}`, keyboard);
}

async function sendReferrals(user: TelegramUserPayload, reply: (message: string) => Promise<unknown>) {
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  const data = await getReferrals(user);
  await reply(
    `👥 ${t(user.id, "referralsTitle")}\\n` +
      `• ${t(user.id, "level1Label")}: ${data.level1Count}\\n` +
      `• ${t(user.id, "level2Label")}: ${data.level2Count}\\n` +
      `• ${t(user.id, "estimatedRewardsLabel")}: ${data.estimatedRewards}`
  );
}

async function sendStarsStore(
  user: TelegramUserPayload,
  reply: (message: string, keyboard?: InlineKeyboard) => Promise<unknown>
) {
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  const lang = userLangStore.get(user.id) ?? DEFAULT_LANG;
  const state = await getGameState(user);
  const starOffers = state.upgrades
    .filter((upgrade) => typeof upgrade.starsPrice === "number" && upgrade.starsPrice > 0)
    .sort((a, b) => (a.starsPrice ?? 0) - (b.starsPrice ?? 0))
    .slice(0, 8);

  if (starOffers.length === 0) {
    await reply(t(user.id, "starsEmpty"));
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const offer of starOffers) {
    const starsPrice = offer.starsPrice ?? 0;
    const title = lang === "ar" ? offer.titleAr : offer.titleEn;
    keyboard.text(`${title} ⭐${starsPrice}`, `starsbuy:${offer.key}`);
    keyboard.row();
  }

  const lines = starOffers.map((offer) => {
    const title = lang === "ar" ? offer.titleAr : offer.titleEn;
    const starsPrice = offer.starsPrice ?? 0;
    return `• ${title} — ⭐${starsPrice} (${offer.currentLevel}/${offer.maxLevel})`;
  });

  await reply(`⭐ ${t(user.id, "starsTitle")}\\n${lines.join("\\n")}`, keyboard);
}

bot.command("start", async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  const startPayload = typeof ctx.match === "string" && ctx.match.trim() ? ctx.match.trim() : undefined;
  const starsUpgradeKey = startPayload?.startsWith("buy_") ? startPayload.slice(4) : undefined;
  const referralCode = starsUpgradeKey ? undefined : startPayload;
  const lang = detectLang(user.language_code);
  userLangStore.set(user.id, lang);

  try {
    await ctx.replyWithChatAction("typing");
    await ctx.reply(welcomeMessage(user.id), {
      reply_markup: mainMenu(user.id)
    });
    void loginWithTelegram(user, referralCode).catch((error) => {
      console.error(`background login failed for ${user.id}:`, error);
    });

    if (starsUpgradeKey) {
      try {
        const state = await getGameState(user);
        const offer = state.upgrades.find((upgrade) => upgrade.key === starsUpgradeKey);
        if (!offer || !offer.starsPrice || offer.starsPrice <= 0) {
          await ctx.reply(t(user.id, "starsEmpty"), { reply_markup: mainMenu(user.id) });
          return;
        }

        const currentLang = userLangStore.get(user.id) ?? DEFAULT_LANG;
        const title = currentLang === "ar" ? offer.titleAr : offer.titleEn;
        const price = offer.starsPrice;
        const payload = JSON.stringify({ type: "upgrade", upgradeKey: offer.key });

        await ctx.replyWithInvoice(
          `${title} • VaultTap`,
          currentLang === "ar"
            ? `شراء ترقية ${title} باستخدام نجوم تيليجرام.`
            : `Purchase ${title} with Telegram Stars.`,
          payload,
          "XTR",
          [{ label: t(user.id, "buyStars"), amount: price }],
          {
            start_parameter: `stars_${offer.key}`
          }
        );
      } catch (error) {
        await ctx.reply(humanError(user.id, error));
      }
    }
  } catch (error) {
    await ctx.reply(humanError(user.id, error));
  }
});

bot.command("menu", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  await ctx.reply(welcomeMessage(user.id), {
    reply_markup: mainMenu(user.id)
  });
});

bot.command("help", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  await ctx.replyWithChatAction("typing");
  await ctx.reply(t(user.id, "help"), {
    reply_markup: mainMenu(user.id)
  });
});

bot.command("profile", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  try {
    await ctx.replyWithChatAction("typing");
    await sendProfile(user, (message) => ctx.reply(message, { reply_markup: mainMenu(user.id) }));
  } catch (error) {
    await ctx.reply(humanError(user.id, error));
  }
});

bot.command("top", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  try {
    await ctx.replyWithChatAction("typing");
    await sendTop(user, (message) => ctx.reply(message, { reply_markup: mainMenu(user.id) }));
  } catch (error) {
    await ctx.reply(humanError(user.id, error));
  }
});

bot.command("tasks", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  try {
    await ctx.replyWithChatAction("typing");
    await sendTasks(user, (message, keyboard) => ctx.reply(message, { reply_markup: keyboard ?? mainMenu(user.id) }));
  } catch (error) {
    await ctx.reply(humanError(user.id, error));
  }
});

bot.command("ref", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  try {
    await ctx.replyWithChatAction("typing");
    await sendReferrals(user, (message) => ctx.reply(message, { reply_markup: mainMenu(user.id) }));
  } catch (error) {
    await ctx.reply(humanError(user.id, error));
  }
});

bot.command("stars", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  try {
    await ctx.replyWithChatAction("typing");
    await sendStarsStore(user, (message, keyboard) =>
      ctx.reply(message, { reply_markup: keyboard ?? mainMenu(user.id) })
    );
  } catch (error) {
    await ctx.reply(humanError(user.id, error));
  }
});

bot.command("lang", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  await ctx.reply(t(user.id, "chooseLanguage"), {
    reply_markup: langMenu()
  });
});

bot.callbackQuery("profile", async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    await ctx.replyWithChatAction("typing");
    await sendProfile(ctx.from, (message) => ctx.reply(message, { reply_markup: mainMenu(ctx.from.id) }));
  } catch (error) {
    await ctx.reply(humanError(ctx.from.id, error));
  }
});

bot.callbackQuery("leaderboard", async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    await ctx.replyWithChatAction("typing");
    await sendTop(ctx.from, (message) => ctx.reply(message, { reply_markup: mainMenu(ctx.from.id) }));
  } catch (error) {
    await ctx.reply(humanError(ctx.from.id, error));
  }
});

bot.callbackQuery("tasks", async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    await ctx.replyWithChatAction("typing");
    await sendTasks(ctx.from, (message, keyboard) =>
      ctx.reply(message, { reply_markup: keyboard ?? mainMenu(ctx.from.id) })
    );
  } catch (error) {
    await ctx.reply(humanError(ctx.from.id, error));
  }
});

bot.callbackQuery("referrals", async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    await ctx.replyWithChatAction("typing");
    await sendReferrals(ctx.from, (message) => ctx.reply(message, { reply_markup: mainMenu(ctx.from.id) }));
  } catch (error) {
    await ctx.reply(humanError(ctx.from.id, error));
  }
});

bot.callbackQuery("stars", async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    await ctx.replyWithChatAction("typing");
    await sendStarsStore(ctx.from, (message, keyboard) =>
      ctx.reply(message, { reply_markup: keyboard ?? mainMenu(ctx.from.id) })
    );
  } catch (error) {
    await ctx.reply(humanError(ctx.from.id, error));
  }
});

bot.callbackQuery("language", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(t(ctx.from.id, "chooseLanguage"), {
    reply_markup: langMenu()
  });
});

bot.callbackQuery("help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(t(ctx.from.id, "help"), {
    reply_markup: mainMenu(ctx.from.id)
  });
});

bot.callbackQuery(/^claim:(.+)$/, async (ctx) => {
  const taskId = ctx.match[1];
  if (!taskId) {
    await ctx.answerCallbackQuery({ text: t(ctx.from.id, "invalidTask") });
    return;
  }

  try {
    const result = await claimTask(ctx.from, taskId);
    await ctx.answerCallbackQuery({ text: `+${result.reward}` });
    await ctx.reply(`${result.message} +${result.reward}`, {
      reply_markup: mainMenu(ctx.from.id)
    });
  } catch (error) {
    await ctx.answerCallbackQuery({ text: t(ctx.from.id, "actionFailed") });
    await ctx.reply(humanError(ctx.from.id, error));
  }
});

bot.callbackQuery(/^starsbuy:(.+)$/, async (ctx) => {
  const upgradeKey = ctx.match[1];
  if (!upgradeKey) {
    await ctx.answerCallbackQuery({ text: t(ctx.from.id, "actionFailed") });
    return;
  }

  try {
    const state = await getGameState(ctx.from);
    const lang = userLangStore.get(ctx.from.id) ?? DEFAULT_LANG;
    const offer = state.upgrades.find((upgrade) => upgrade.key === upgradeKey);
    if (!offer || !offer.starsPrice || offer.starsPrice <= 0) {
      await ctx.answerCallbackQuery({ text: t(ctx.from.id, "starsEmpty") });
      return;
    }

    const title = lang === "ar" ? offer.titleAr : offer.titleEn;
    const price = offer.starsPrice;
    const payload = JSON.stringify({ type: "upgrade", upgradeKey: offer.key });

    await ctx.replyWithInvoice(
      `${title} • VaultTap`,
      lang === "ar"
        ? `شراء ترقية ${title} باستخدام نجوم تيليجرام.`
        : `Purchase ${title} with Telegram Stars.`,
      payload,
      "XTR",
      [{ label: t(ctx.from.id, "buyStars"), amount: price }],
      {
        start_parameter: `stars_${offer.key}`
      }
    );
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.answerCallbackQuery({ text: t(ctx.from.id, "actionFailed") });
    await ctx.reply(humanError(ctx.from.id, error));
  }
});

bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on("message:successful_payment", async (ctx) => {
  const payment = ctx.message.successful_payment;
  try {
    await confirmStarsPayment({
      telegramId: ctx.from.id,
      telegramPaymentChargeId: payment.telegram_payment_charge_id,
      providerPaymentChargeId: payment.provider_payment_charge_id,
      payload: payment.invoice_payload,
      totalAmount: payment.total_amount
    });
    await ctx.reply(t(ctx.from.id, "starsPurchased"), {
      reply_markup: mainMenu(ctx.from.id)
    });
  } catch (error) {
    console.error("Stars confirmation failed:", error);
    await ctx.reply(t(ctx.from.id, "paymentFailed"), {
      reply_markup: mainMenu(ctx.from.id)
    });
  }
});

bot.callbackQuery(/^lang:(.+)$/, async (ctx) => {
  const requested = ctx.match[1] as Lang;
  if (!LANGS.includes(requested)) {
    await ctx.answerCallbackQuery({ text: "Invalid language" });
    return;
  }
  userLangStore.set(ctx.from.id, requested);
  await ctx.answerCallbackQuery({ text: requested.toUpperCase() });
  await ctx.reply(welcomeMessage(ctx.from.id), {
    reply_markup: mainMenu(ctx.from.id)
  });
});

bot.catch((error) => {
  console.error("Bot error:", error.error);
});

const BOT_COMMANDS = [
  { command: "start", description: "تشغيل البوت" },
  { command: "menu", description: "فتح القائمة الرئيسية" },
  { command: "help", description: "عرض جميع الأوامر" },
  { command: "profile", description: "عرض الملف والإحصائيات" },
  { command: "top", description: "عرض قائمة الصدارة" },
  { command: "tasks", description: "عرض المهام وتحصيلها" },
  { command: "ref", description: "عرض أداء الإحالات" },
  { command: "stars", description: "شراء الترقيات بالنجوم" },
  { command: "lang", description: "تغيير اللغة" }
];
let commandsConfigured = false;

const BOT_START_RETRY_MS = Number(process.env.BOT_START_RETRY_MS ?? 10000);

function startupErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown startup error";
  }
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureBotConfigured(): Promise<void> {
  if (commandsConfigured) return;
  await bot.api.setMyCommands(BOT_COMMANDS);
  commandsConfigured = true;
}

export async function startBotWithRetry(): Promise<void> {
  while (true) {
    try {
      await ensureBotConfigured();
      await bot.start({
        onStart(botInfo) {
          console.log(`VaultTap bot started as @${botInfo.username}`);
        }
      });
      return;
    } catch (error) {
      const message = startupErrorMessage(error);
      console.error(`Bot startup failed: ${message}`);

      const normalized = message.toLowerCase();
      if (normalized.includes("unauthorized") || normalized.includes("token")) {
        console.error("Check TELEGRAM_BOT_TOKEN in Railway variables and redeploy this service.");
      }

      console.error(`Retrying bot startup in ${BOT_START_RETRY_MS}ms ...`);
      await delay(BOT_START_RETRY_MS);
    }
  }
}

export { bot };

if (env.BOT_RUN_MODE === "polling") {
  void startBotWithRetry();
}
