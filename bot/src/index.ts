import { Bot, InlineKeyboard } from "grammy";

import { env } from "./config/env.js";
import {
  claimTask,
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
  welcome: "Welcome to VaultTap!\\nPress the button below and start earning now.",
  openApp: "🚀 Open VaultTap Mini App",
  profile: "👤 Profile",
  leaderboard: "🏆 Leaderboard",
  tasks: "✅ Tasks",
  referrals: "👥 Referrals",
  language: "🌐 Language",
  chooseLanguage: "Choose language:",
  profileTitle: "Your current stats",
  globalTop: "Top 10 players",
  tasksTitle: "Tasks list",
  noTasks: "No tasks available right now.",
  claimDaily: "Claim daily task",
  claimed: "Claimed",
  referralsTitle: "Referral stats",
  pointsLabel: "Points",
  energyLabel: "Energy",
  comboLabel: "Combo",
  pphLabel: "PPH",
  tapPowerLabel: "Tap Power",
  totalTapsLabel: "Total Taps",
  referralCodeLabel: "Referral Code",
  level1Label: "Level 1",
  level2Label: "Level 2",
  estimatedRewardsLabel: "Estimated Rewards",
  loginSetupError:
    "Bot login failed due to server config. Check backend settings and redeploy backend + bot.",
  serverDownError: "Server is not responding. Try again in a moment.",
  invalidTask: "Invalid task.",
  actionFailed: "Action failed.",
  help:
    "Commands:\\n/start Start bot\\n/menu Main menu\\n/profile Your stats\\n/top Leaderboard\\n/tasks Tasks\\n/ref Referrals\\n/lang Change language",
  error: "Something went wrong. Try again."
};

type TextKey = keyof typeof enText;
type BotText = Record<TextKey, string>;

const text: Record<Lang, BotText> = {
  ar: {
    welcome: "هلا وسهلا بك في بوت VaultTap 🚀\\nاضغط الزر بالأسفل وابدأ تجميع النقاط الآن.",
    openApp: "🚀 فتح تطبيق VaultTap",
    profile: "👤 ملفي",
    leaderboard: "🏆 الصدارة",
    tasks: "✅ المهام",
    referrals: "👥 الإحالات",
    language: "🌐 اللغة",
    chooseLanguage: "اختر اللغة:",
    profileTitle: "إحصائياتك الحالية",
    globalTop: "أفضل 10 لاعبين",
    tasksTitle: "قائمة المهام",
    noTasks: "لا توجد مهام متاحة الآن.",
    claimDaily: "تحصيل المهمة اليومية",
    claimed: "تم التحصيل",
    referralsTitle: "إحصائيات الإحالات",
    pointsLabel: "النقاط",
    energyLabel: "الطاقة",
    comboLabel: "الكومبو",
    pphLabel: "الربح بالساعة",
    tapPowerLabel: "قوة النقر",
    totalTapsLabel: "إجمالي النقرات",
    referralCodeLabel: "كود الإحالة",
    level1Label: "المستوى الأول",
    level2Label: "المستوى الثاني",
    estimatedRewardsLabel: "المكافآت التقديرية",
    loginSetupError:
      "تعذر تسجيل الدخول من البوت. تحقق من إعدادات الخادم ثم أعد نشر backend و bot.",
    serverDownError: "الخادم لا يستجيب الآن، حاول مرة أخرى بعد قليل.",
    invalidTask: "معرّف المهمة غير صالح.",
    actionFailed: "فشلت العملية.",
    help:
      "الأوامر:\\n/start تشغيل البوت\\n/menu القائمة الرئيسية\\n/profile ملفك\\n/top الصدارة\\n/tasks المهام\\n/ref الإحالات\\n/lang تغيير اللغة",
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
    .text(t(userId, "leaderboard"), "leaderboard")
    .text(t(userId, "tasks"), "tasks")
    .row()
    .text(t(userId, "referrals"), "referrals")
    .text(t(userId, "language"), "language");
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

  return message || t(userId, "error");
}

const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

async function sendProfile(user: TelegramUserPayload, reply: (message: string) => Promise<unknown>) {
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  const data = await getProfile(user);
  await reply(
    `${t(user.id, "profileTitle")}\\n` +
      `${t(user.id, "pointsLabel")}: ${data.user.points}\\n` +
      `${t(user.id, "energyLabel")}: ${data.user.energy}/${data.user.maxEnergy}\\n` +
      `${t(user.id, "comboLabel")}: x${data.user.comboMultiplier.toFixed(2)}\\n` +
      `${t(user.id, "pphLabel")}: ${data.user.pph}\\n` +
      `${t(user.id, "tapPowerLabel")}: ${data.user.tapPower}\\n` +
      `${t(user.id, "totalTapsLabel")}: ${data.user.totalTaps}\\n` +
      `${t(user.id, "referralCodeLabel")}: ${data.user.referralCode}`
  );
}

async function sendTop(user: TelegramUserPayload, reply: (message: string) => Promise<unknown>) {
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  const top = await getLeaderboard("global", user);
  const rows = top.map((item) => `${item.rank}. ${item.name} - ${item.points}`).join("\\n");
  await reply(`${t(user.id, "globalTop")}\\n${rows}`);
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
    const status = task.isClaimed ? `(${t(user.id, "claimed")})` : "";
    return `- ${title} +${task.reward} ${status}`.trim();
  });

  const daily = data.tasks.find((task) => task.key === "daily_check_in" && !task.isClaimed);
  const keyboard = daily
    ? new InlineKeyboard().text(t(user.id, "claimDaily"), `claim:${daily.id}`)
    : undefined;

  await reply(`${t(user.id, "tasksTitle")}\\n${lines.join("\\n")}`, keyboard);
}

async function sendReferrals(user: TelegramUserPayload, reply: (message: string) => Promise<unknown>) {
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  const data = await getReferrals(user);
  await reply(
    `${t(user.id, "referralsTitle")}\\n` +
      `${t(user.id, "level1Label")}: ${data.level1Count}\\n` +
      `${t(user.id, "level2Label")}: ${data.level2Count}\\n` +
      `${t(user.id, "estimatedRewardsLabel")}: ${data.estimatedRewards}`
  );
}

bot.command("start", async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  const referralCode = typeof ctx.match === "string" && ctx.match.trim() ? ctx.match.trim() : undefined;
  const lang = detectLang(user.language_code);
  userLangStore.set(user.id, lang);

  try {
    await loginWithTelegram(user, referralCode);
    await ctx.reply(t(user.id, "welcome"), {
      reply_markup: mainMenu(user.id)
    });
  } catch (error) {
    await ctx.reply(humanError(user.id, error));
  }
});

bot.command("menu", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  await ctx.reply(t(user.id, "welcome"), {
    reply_markup: mainMenu(user.id)
  });
});

bot.command("help", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  await ctx.reply(t(user.id, "help"), {
    reply_markup: mainMenu(user.id)
  });
});

bot.command("profile", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  try {
    await sendProfile(user, (message) => ctx.reply(message, { reply_markup: mainMenu(user.id) }));
  } catch (error) {
    await ctx.reply(humanError(user.id, error));
  }
});

bot.command("top", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  try {
    await sendTop(user, (message) => ctx.reply(message, { reply_markup: mainMenu(user.id) }));
  } catch (error) {
    await ctx.reply(humanError(user.id, error));
  }
});

bot.command("tasks", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  try {
    await sendTasks(user, (message, keyboard) => ctx.reply(message, { reply_markup: keyboard ?? mainMenu(user.id) }));
  } catch (error) {
    await ctx.reply(humanError(user.id, error));
  }
});

bot.command("ref", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  try {
    await sendReferrals(user, (message) => ctx.reply(message, { reply_markup: mainMenu(user.id) }));
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
    await sendProfile(ctx.from, (message) => ctx.reply(message, { reply_markup: mainMenu(ctx.from.id) }));
  } catch (error) {
    await ctx.reply(humanError(ctx.from.id, error));
  }
});

bot.callbackQuery("leaderboard", async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    await sendTop(ctx.from, (message) => ctx.reply(message, { reply_markup: mainMenu(ctx.from.id) }));
  } catch (error) {
    await ctx.reply(humanError(ctx.from.id, error));
  }
});

bot.callbackQuery("tasks", async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
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
    await sendReferrals(ctx.from, (message) => ctx.reply(message, { reply_markup: mainMenu(ctx.from.id) }));
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

bot.callbackQuery(/^lang:(.+)$/, async (ctx) => {
  const requested = ctx.match[1] as Lang;
  if (!LANGS.includes(requested)) {
    await ctx.answerCallbackQuery({ text: "Invalid language" });
    return;
  }
  userLangStore.set(ctx.from.id, requested);
  await ctx.answerCallbackQuery({ text: requested.toUpperCase() });
  await ctx.reply(t(ctx.from.id, "welcome"), {
    reply_markup: mainMenu(ctx.from.id)
  });
});

bot.catch((error) => {
  console.error("Bot error:", error.error);
});

await bot.api.setMyCommands([
  { command: "start", description: "تشغيل البوت" },
  { command: "menu", description: "فتح القائمة الرئيسية" },
  { command: "help", description: "عرض جميع الأوامر" },
  { command: "profile", description: "عرض الملف والإحصائيات" },
  { command: "top", description: "عرض قائمة الصدارة" },
  { command: "tasks", description: "عرض المهام وتحصيلها" },
  { command: "ref", description: "عرض أداء الإحالات" },
  { command: "lang", description: "تغيير اللغة" }
]);

bot.start({
  onStart(botInfo) {
    console.log(`VaultTap bot started as @${botInfo.username}`);
  }
});
