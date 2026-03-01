/**
 * VaultTap Bot - Beautiful Integration Update
 * 
 * This file shows how to update bot/src/index.ts to use the new MessageFormatter
 * and UI system. Copy relevant sections into your existing index.ts
 * 
 * Key improvements:
 * - Beautiful formatted messages with emojis and gradients
 * - Interactive inline keyboards with multiple pages
 * - Consistent UI across all commands
 * - Better error handling with styled messages
 * - Enhanced user experience with visual hierarchy
 */

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
  type TelegramUserPayload,
} from "./services/backend.js";

import {
  MessageFormatter,
  type UserProfile,
  type LeaderboardEntry,
  type TaskEntry,
} from "./lib/message-formatter.js";
import { KeyboardDesigner } from "./lib/keyboard-designer.js";
import { UIBuilder } from "./lib/ui-builder.js";
import { ThemeManager, LightTheme, DarkTheme } from "./lib/theme.js";

type Lang = "ar" | "en" | "ru" | "tr" | "es" | "fa" | "id";
const LANGS: Lang[] = ["ar", "en", "ru", "tr", "es", "fa", "id"];

const DEFAULT_LANG: Lang = LANGS.includes(env.DEFAULT_LANGUAGE as Lang)
  ? (env.DEFAULT_LANGUAGE as Lang)
  : "ar";

// Set premium dark theme
ThemeManager.setTheme(DarkTheme);

/**
 * ============ UPDATED COMMAND HANDLERS ============
 */

const bot = new Bot(env.TELEGRAM_TOKEN);

// /start - Beautiful welcome message
bot.command("start", async (ctx) => {
  try {
    const name = ctx.from?.first_name || "Tapster";
    const message = MessageFormatter.welcomeMessage(name);
    await ctx.reply(message.text, message.options);
  } catch (error) {
    console.error("Start command error:", error);
    await ctx.reply("Welcome to VaultTap!");
  }
});

// /menu - Main menu with beautiful styling
bot.command("menu", async (ctx) => {
  try {
    const message = MessageFormatter.mainMenuMessage();
    await ctx.reply(message.text, message.options);
  } catch (error) {
    console.error("Menu command error:", error);
  }
});

// /profile - Beautiful profile display
bot.command("profile", async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply("Please sign in first");
      return;
    }

    // Fetch real user data or use mock data
    const profile: UserProfile = {
      username: ctx.from?.first_name || "Player",
      level: 25,
      points: 5280,
      energy: 450,
      rank: 42,
      totalTaps: 120000,
      combo: 15.5,
      pph: 1200,
      autoTap: 50,
      tapPower: 15,
    };

    const message = MessageFormatter.profileMessage(profile);
    await ctx.reply(message.text, message.options);
  } catch (error) {
    console.error("Profile command error:", error);
    const errorMsg = MessageFormatter.errorMessage(
      "Profile Error",
      "Could not load profile data"
    );
    await ctx.reply(errorMsg.text, errorMsg.options);
  }
});

// /top - Beautiful leaderboard
bot.command("top", async (ctx) => {
  try {
    // Fetch real leaderboard data or use mock data
    const entries: LeaderboardEntry[] = [
      { rank: 1, username: "Champion", score: 500000 },
      { rank: 2, username: "Master", score: 450000 },
      { rank: 3, username: "Expert", score: 400000 },
      { rank: 4, username: "Pro", score: 350000 },
      { rank: 5, username: "Player", score: 300000 },
    ];

    const message = MessageFormatter.leaderboardMessage(entries, 1);
    await ctx.reply(message.text, message.options);
  } catch (error) {
    console.error("Leaderboard command error:", error);
    const errorMsg = MessageFormatter.errorMessage(
      "Leaderboard Error",
      "Could not load leaderboard"
    );
    await ctx.reply(errorMsg.text, errorMsg.options);
  }
});

// /tasks - Beautiful task list
bot.command("tasks", async (ctx) => {
  try {
    const tasks: TaskEntry[] = [
      { name: "Daily Check-in", reward: 100, completed: false, emoji: "📅" },
      { name: "Watch Video", reward: 500, completed: false, emoji: "🎬" },
      { name: "Invite Friend", reward: 1000, completed: true, emoji: "👥" },
      { name: "Follow Channel", reward: 750, completed: false, emoji: "📢" },
      { name: "Share Post", reward: 250, completed: true, emoji: "🔗" },
    ];

    const message = MessageFormatter.tasksMessage(tasks, false);
    await ctx.reply(message.text, message.options);
  } catch (error) {
    console.error("Tasks command error:", error);
    const errorMsg = MessageFormatter.errorMessage(
      "Tasks Error",
      "Could not load tasks"
    );
    await ctx.reply(errorMsg.text, errorMsg.options);
  }
});

// /referrals - Beautiful referral stats
bot.command("referrals", async (ctx) => {
  try {
    const referralData = {
      totalReferrals: 42,
      activeReferrals: 28,
      referralBonus: 5250,
      totalEarnings: 12500,
    };

    const message = MessageFormatter.referralMessage(referralData);
    await ctx.reply(message.text, message.options);
  } catch (error) {
    console.error("Referrals command error:", error);
  }
});

// /help - Help menu
bot.command("help", async (ctx) => {
  try {
    const message = MessageFormatter.helpMessage();
    await ctx.reply(message.text, message.options);
  } catch (error) {
    console.error("Help command error:", error);
  }
});

// /lang - Language selection
bot.command("lang", async (ctx) => {
  try {
    const message = MessageFormatter.languageSelectionMessage();
    await ctx.reply(message.text, message.options);
  } catch (error) {
    console.error("Language command error:", error);
  }
});

/**
 * ============ CALLBACK QUERY HANDLERS ============
 */

// Main menu callback
bot.callbackQuery("menu", async (ctx) => {
  try {
    const message = MessageFormatter.mainMenuMessage();
    await ctx.editMessageText(message.text, message.options);
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.answerCallbackQuery({
      text: "Error loading menu",
      show_alert: true,
    });
  }
});

// Profile callback
bot.callbackQuery("profile", async (ctx) => {
  try {
    const profile: UserProfile = {
      username: "Tapster",
      level: 25,
      points: 5280,
      energy: 450,
      rank: 42,
      totalTaps: 120000,
      combo: 15.5,
      pph: 1200,
      autoTap: 50,
      tapPower: 15,
    };

    const message = MessageFormatter.profileMessage(profile);
    await ctx.editMessageText(message.text, message.options);
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.answerCallbackQuery({
      text: "Error loading profile",
      show_alert: true,
    });
  }
});

// Leaderboard callback
bot.callbackQuery("top", async (ctx) => {
  try {
    const entries: LeaderboardEntry[] = [
      { rank: 1, username: "Champion", score: 500000 },
      { rank: 2, username: "Master", score: 450000 },
      { rank: 3, username: "Expert", score: 400000 },
    ];

    const message = MessageFormatter.leaderboardMessage(entries, 1);
    await ctx.editMessageText(message.text, message.options);
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.answerCallbackQuery({
      text: "Error loading leaderboard",
      show_alert: true,
    });
  }
});

// Tasks callback
bot.callbackQuery("tasks", async (ctx) => {
  try {
    const tasks: TaskEntry[] = [
      { name: "Daily Check-in", reward: 100, completed: false },
      { name: "Watch Video", reward: 500, completed: false },
    ];

    const message = MessageFormatter.tasksMessage(tasks, false);
    await ctx.editMessageText(message.text, message.options);
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.answerCallbackQuery({
      text: "Error loading tasks",
      show_alert: true,
    });
  }
});

// Claim task callback
bot.callbackQuery(/^claim_/, async (ctx) => {
  try {
    const taskName = ctx.match.substring(6);
    const message = MessageFormatter.taskClaimedMessage(taskName, 500);
    await ctx.editMessageText(message.text, message.options);
    await ctx.answerCallbackQuery({
      text: "Task claimed! ✅",
      show_alert: false,
    });
  } catch (error) {
    await ctx.answerCallbackQuery({
      text: "Failed to claim task",
      show_alert: true,
    });
  }
});

// Language selection callback
bot.callbackQuery("language", async (ctx) => {
  try {
    const message = MessageFormatter.languageSelectionMessage();
    await ctx.editMessageText(message.text, message.options);
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.answerCallbackQuery({
      text: "Error loading language menu",
      show_alert: true,
    });
  }
});

// Set language callback
bot.callbackQuery(/^lang_/, async (ctx) => {
  try {
    const lang = ctx.match.substring(5);
    const successMsg = MessageFormatter.successMessage(
      "Language Updated",
      `Language changed to ${lang.toUpperCase()}`
    );
    await ctx.editMessageText(successMsg.text, successMsg.options);
    await ctx.answerCallbackQuery({
      text: `Language updated to ${lang}! 🌐`,
      show_alert: false,
    });
  } catch (error) {
    await ctx.answerCallbackQuery({
      text: "Error updating language",
      show_alert: true,
    });
  }
});

// Help callback
bot.callbackQuery("help", async (ctx) => {
  try {
    const message = MessageFormatter.helpMessage();
    await ctx.editMessageText(message.text, message.options);
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.answerCallbackQuery({
      text: "Error loading help",
      show_alert: true,
    });
  }
});

// Back to menu callbacks
bot.callbackQuery(/^(back|menu)$/, async (ctx) => {
  try {
    const message = MessageFormatter.mainMenuMessage();
    await ctx.editMessageText(message.text, message.options);
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.answerCallbackQuery({
      text: "Error loading menu",
      show_alert: true,
    });
  }
});

/**
 * ============ ERROR HANDLING ============
 */

bot.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error("Bot error:", error);
    try {
      const errorMsg = MessageFormatter.errorMessage(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      await ctx.reply(errorMsg.text, errorMsg.options);
    } catch (replyError) {
      console.error("Failed to send error message:", replyError);
    }
  }
});

/**
 * ============ START BOT ============
 */

bot.start();

console.log("🤖 VaultTap Bot is running with beautiful UI system!");
console.log("📱 Theme: Dark");
console.log("🎨 UI System: MessageFormatter + Animations");

export default bot;

/**
 * ============ INTEGRATION NOTES ============
 *
 * BEFORE/AFTER Examples:
 *
 * BEFORE:
 *   await ctx.reply("Welcome to VaultTap!\nTap to earn...");
 *
 * AFTER:
 *   const message = MessageFormatter.welcomeMessage(userName);
 *   await ctx.reply(message.text, message.options);
 *
 * ============================================
 * 
 * The new UI system provides:
 * - Beautiful ASCII art borders and layouts
 * - Emoji for visual hierarchy
 * - Inline keyboards with meaningful callbacks
 * - Consistent formatting across all commands
 * - Error messages with styling
 * - Success confirmations with animations
 * - Support for multiple languages
 * 
 * All messages are formatted using MessageFormatter which:
 * - Creates consistent visual style
 * - Handles emoji placement
 * - Provides inline buttons/keyboards
 * - Supports multiple themes (Light, Dark)
 * - Returns {text, options} for ctx.reply()
 * 
 * ============================================
 */
