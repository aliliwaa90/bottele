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

const text = {
  ar: {
    welcome: "مرحباً بك في VaultTap.\nاضغط على الزر لفتح اللعبة وابدأ جمع النقاط الآن.",
    openApp: "فتح VaultTap Mini App",
    profile: "ملفي",
    leaderboard: "الصدارة",
    tasks: "المهام",
    referrals: "الإحالات",
    language: "اللغة",
    chooseLanguage: "اختر اللغة:",
    profileTitle: "إحصائياتك الحالية",
    globalTop: "أفضل 10 لاعبين",
    tasksTitle: "قائمة المهام",
    noTasks: "لا توجد مهام متاحة حالياً.",
    claimDaily: "تحصيل المهمة اليومية",
    claimed: "تم التحصيل",
    referralsTitle: "إحصائيات الإحالات",
    help:
      "الأوامر المتاحة:\n/start تشغيل البوت\n/profile ملفك\n/top الصدارة\n/tasks المهام\n/ref الإحالات\n/lang تغيير اللغة",
    error: "حدث خطأ، حاول مرة أخرى."
  },
  en: {
    welcome: "Welcome to VaultTap.\nTap the button to open the game and start earning now.",
    openApp: "Open VaultTap Mini App",
    profile: "My Profile",
    leaderboard: "Leaderboard",
    tasks: "Tasks",
    referrals: "Referrals",
    language: "Language",
    chooseLanguage: "Choose language:",
    profileTitle: "Your current stats",
    globalTop: "Top 10 players",
    tasksTitle: "Tasks list",
    noTasks: "No tasks available right now.",
    claimDaily: "Claim daily task",
    claimed: "Claimed",
    referralsTitle: "Referral stats",
    help:
      "Available commands:\n/start launch bot\n/profile your stats\n/top leaderboard\n/tasks tasks\n/ref referrals\n/lang change language",
    error: "Something went wrong. Try again."
  },
  ru: {
    welcome: "Добро пожаловать в VaultTap.\nНажмите кнопку и начните зарабатывать.",
    openApp: "Открыть VaultTap Mini App",
    profile: "Профиль",
    leaderboard: "Рейтинг",
    tasks: "Задания",
    referrals: "Рефералы",
    language: "Язык",
    chooseLanguage: "Выберите язык:",
    profileTitle: "Ваша текущая статистика",
    globalTop: "Топ 10 игроков",
    tasksTitle: "Список заданий",
    noTasks: "Сейчас нет доступных заданий.",
    claimDaily: "Забрать ежедневное задание",
    claimed: "Получено",
    referralsTitle: "Реферальная статистика",
    help:
      "Команды:\n/start запуск бота\n/profile профиль\n/top рейтинг\n/tasks задания\n/ref рефералы\n/lang язык",
    error: "Произошла ошибка."
  },
  tr: {
    welcome: "VaultTap'e hos geldin.\nButona bas ve kazanmaya basla.",
    openApp: "VaultTap Mini App Ac",
    profile: "Profilim",
    leaderboard: "Liderlik",
    tasks: "Gorevler",
    referrals: "Referanslar",
    language: "Dil",
    chooseLanguage: "Dil sec:",
    profileTitle: "Guncel istatistiklerin",
    globalTop: "Ilk 10 oyuncu",
    tasksTitle: "Gorev listesi",
    noTasks: "Su an gorev yok.",
    claimDaily: "Gunluk gorevi al",
    claimed: "Alindi",
    referralsTitle: "Referans istatistikleri",
    help:
      "Komutlar:\n/start botu ac\n/profile profil\n/top liderlik\n/tasks gorevler\n/ref referanslar\n/lang dil",
    error: "Bir hata olustu."
  },
  es: {
    welcome: "Bienvenido a VaultTap.\nPulsa el boton y empieza a ganar.",
    openApp: "Abrir VaultTap Mini App",
    profile: "Mi Perfil",
    leaderboard: "Ranking",
    tasks: "Tareas",
    referrals: "Referidos",
    language: "Idioma",
    chooseLanguage: "Elige idioma:",
    profileTitle: "Tus estadisticas actuales",
    globalTop: "Top 10 jugadores",
    tasksTitle: "Lista de tareas",
    noTasks: "No hay tareas disponibles ahora.",
    claimDaily: "Reclamar tarea diaria",
    claimed: "Reclamado",
    referralsTitle: "Estadisticas de referidos",
    help:
      "Comandos:\n/start iniciar bot\n/profile perfil\n/top ranking\n/tasks tareas\n/ref referidos\n/lang idioma",
    error: "Ocurrio un error."
  },
  fa: {
    welcome: "به VaultTap خوش آمديد.\nدکمه را بزنيد و امتياز جمع کنيد.",
    openApp: "باز کردن VaultTap Mini App",
    profile: "پروفايل من",
    leaderboard: "رتبه‌بندي",
    tasks: "ماموريت‌ها",
    referrals: "دعوت‌ها",
    language: "زبان",
    chooseLanguage: "زبان را انتخاب کنيد:",
    profileTitle: "آمار فعلي شما",
    globalTop: "10 بازيکن برتر",
    tasksTitle: "فهرست ماموريت‌ها",
    noTasks: "فعلاً ماموريتي در دسترس نيست.",
    claimDaily: "دريافت ماموريت روزانه",
    claimed: "دريافت شد",
    referralsTitle: "آمار دعوت‌ها",
    help:
      "دستورات:\n/start شروع ربات\n/profile پروفايل\n/top رتبه‌بندي\n/tasks ماموريت‌ها\n/ref دعوت‌ها\n/lang زبان",
    error: "خطايي رخ داد."
  },
  id: {
    welcome: "Selamat datang di VaultTap.\nTekan tombol dan mulai kumpulkan poin.",
    openApp: "Buka VaultTap Mini App",
    profile: "Profil Saya",
    leaderboard: "Peringkat",
    tasks: "Tugas",
    referrals: "Referral",
    language: "Bahasa",
    chooseLanguage: "Pilih bahasa:",
    profileTitle: "Statistik kamu saat ini",
    globalTop: "10 pemain teratas",
    tasksTitle: "Daftar tugas",
    noTasks: "Belum ada tugas tersedia.",
    claimDaily: "Klaim tugas harian",
    claimed: "Sudah diklaim",
    referralsTitle: "Statistik referral",
    help:
      "Perintah:\n/start mulai bot\n/profile profil\n/top peringkat\n/tasks tugas\n/ref referral\n/lang bahasa",
    error: "Terjadi kesalahan."
  }
} as const;

const userLangStore = new Map<number, Lang>();

function detectLang(code?: string): Lang {
  if (!code) return env.DEFAULT_LANGUAGE as Lang;
  const direct = code.toLowerCase().slice(0, 2) as Lang;
  if (LANGS.includes(direct)) return direct;
  return env.DEFAULT_LANGUAGE as Lang;
}

function t(userId: number, key: keyof (typeof text)["ar"]): string {
  const lang = userLangStore.get(userId) ?? (env.DEFAULT_LANGUAGE as Lang);
  return text[lang][key];
}

function getLang(userId: number): Lang {
  return userLangStore.get(userId) ?? (env.DEFAULT_LANGUAGE as Lang);
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

const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

async function sendProfile(user: TelegramUserPayload, reply: (message: string) => Promise<unknown>) {
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  const data = await getProfile(user);
  await reply(
    `${t(user.id, "profileTitle")}\n` +
      `Points: ${data.user.points}\n` +
      `Energy: ${data.user.energy}/${data.user.maxEnergy}\n` +
      `Combo: x${data.user.comboMultiplier.toFixed(2)}\n` +
      `PPH: ${data.user.pph}\n` +
      `Tap Power: ${data.user.tapPower}\n` +
      `Total Taps: ${data.user.totalTaps}\n` +
      `Referral: ${data.user.referralCode}`
  );
}

async function sendTop(user: TelegramUserPayload, reply: (message: string) => Promise<unknown>) {
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  const top = await getLeaderboard("global", user);
  const rows = top.map((item) => `${item.rank}. ${item.name} - ${item.points}`).join("\n");
  await reply(`${t(user.id, "globalTop")}\n${rows}`);
}

async function sendTasks(user: TelegramUserPayload, reply: (message: string, keyboard?: InlineKeyboard) => Promise<unknown>) {
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  const lang = getLang(user.id);
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

  await reply(`${t(user.id, "tasksTitle")}\n${lines.join("\n")}`, keyboard);
}

async function sendReferrals(user: TelegramUserPayload, reply: (message: string) => Promise<unknown>) {
  userLangStore.set(user.id, userLangStore.get(user.id) ?? detectLang(user.language_code));
  const data = await getReferrals(user);
  await reply(
    `${t(user.id, "referralsTitle")}\n` +
      `L1: ${data.level1Count}\n` +
      `L2: ${data.level2Count}\n` +
      `Estimated Rewards: ${data.estimatedRewards}`
  );
}

bot.command("start", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  const referralCode = ctx.match?.trim() || undefined;
  const lang = detectLang(user.language_code);
  userLangStore.set(user.id, lang);

  try {
    await loginWithTelegram(user, referralCode);
    await ctx.reply(t(user.id, "welcome"), {
      reply_markup: mainMenu(user.id)
    });
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : t(user.id, "error"));
  }
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
  } catch {
    await ctx.reply(t(user.id, "error"));
  }
});

bot.command("top", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  try {
    await sendTop(user, (message) => ctx.reply(message, { reply_markup: mainMenu(user.id) }));
  } catch {
    await ctx.reply(t(user.id, "error"));
  }
});

bot.command("tasks", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  try {
    await sendTasks(user, (message, keyboard) => ctx.reply(message, { reply_markup: keyboard ?? mainMenu(user.id) }));
  } catch {
    await ctx.reply(t(user.id, "error"));
  }
});

bot.command("ref", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  try {
    await sendReferrals(user, (message) => ctx.reply(message, { reply_markup: mainMenu(user.id) }));
  } catch {
    await ctx.reply(t(user.id, "error"));
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
  } catch {
    await ctx.reply(t(ctx.from.id, "error"));
  }
});

bot.callbackQuery("leaderboard", async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    await sendTop(ctx.from, (message) => ctx.reply(message, { reply_markup: mainMenu(ctx.from.id) }));
  } catch {
    await ctx.reply(t(ctx.from.id, "error"));
  }
});

bot.callbackQuery("tasks", async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    await sendTasks(ctx.from, (message, keyboard) =>
      ctx.reply(message, { reply_markup: keyboard ?? mainMenu(ctx.from.id) })
    );
  } catch {
    await ctx.reply(t(ctx.from.id, "error"));
  }
});

bot.callbackQuery("referrals", async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    await sendReferrals(ctx.from, (message) => ctx.reply(message, { reply_markup: mainMenu(ctx.from.id) }));
  } catch {
    await ctx.reply(t(ctx.from.id, "error"));
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
    await ctx.answerCallbackQuery({ text: "Invalid task" });
    return;
  }
  try {
    const result = await claimTask(ctx.from, taskId);
    await ctx.answerCallbackQuery({ text: `+${result.reward}` });
    await ctx.reply(`${result.message} +${result.reward}`, {
      reply_markup: mainMenu(ctx.from.id)
    });
  } catch (error) {
    await ctx.answerCallbackQuery({ text: "Failed" });
    await ctx.reply(error instanceof Error ? error.message : t(ctx.from.id, "error"));
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
  { command: "start", description: "Launch VaultTap mini app" },
  { command: "help", description: "Show all bot commands" },
  { command: "profile", description: "Show your profile and economy stats" },
  { command: "top", description: "Show global leaderboard" },
  { command: "tasks", description: "Show and claim available tasks" },
  { command: "ref", description: "Show referral performance" },
  { command: "lang", description: "Change language" }
]);

bot.start({
  onStart(botInfo) {
    console.log(`VaultTap bot started as @${botInfo.username}`);
  }
});
