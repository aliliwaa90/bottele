/**
 * VaultTap Bot - Enhanced Handler with Beautiful UI System
 * Integration with modern UI components and animations
 */

import { Bot, Context, InlineKeyboard } from "grammy";
import { MessageFormatter, type UserProfile, type LeaderboardEntry, type TaskEntry } from "./lib/message-formatter.js";
import { KeyboardDesigner } from "./lib/keyboard-designer.js";
import { UIBuilder } from "./lib/ui-builder.js";
import { ThemeManager, DarkTheme } from "./lib/theme.js";

/**
 * Initialize bot with modern UI system
 */
export function createBeautifulBot(token: string): Bot {
  const bot = new Bot(token);

  // Set premium theme
  ThemeManager.setTheme(DarkTheme);

  // ============ COMMAND HANDLERS ============

  // /start - Beautiful welcome
  bot.command("start", async (ctx) => {
    const message = MessageFormatter.welcomeMessage(
      ctx.from?.first_name || "User"
    );
    await ctx.reply(message.text, message.options);
  });

  // /menu - Enhanced main menu
  bot.command("menu", async (ctx) => {
    const message = MessageFormatter.mainMenuMessage();
    await ctx.reply(message.text, message.options);
  });

  // /profile - Beautiful profile display
  bot.command("profile", async (ctx) => {
    try {
      // Fetch user data from backend
      const userData = await ctx.api.getMe(); // Replace with actual API call
      
      const profile: UserProfile = {
        username: ctx.from?.first_name || "User",
        level: 25, // Replace with actual data
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
      const errorMsg = MessageFormatter.errorMessage(
        "Profile Error",
        error instanceof Error ? error.message : "Could not load profile"
      );
      await ctx.reply(errorMsg.text, errorMsg.options);
    }
  });

  // /top - Beautiful leaderboard
  bot.command("top", async (ctx) => {
    try {
      const entries: LeaderboardEntry[] = [
        { rank: 1, username: "Player1", score: 100000 },
        { rank: 2, username: "Player2", score: 95000 },
        { rank: 3, username: "Player3", score: 90000 },
        { rank: 4, username: "Player4", score: 85000 },
        { rank: 5, username: "Player5", score: 80000 },
      ];

      const message = MessageFormatter.leaderboardMessage(entries, 1);
      await ctx.reply(message.text, message.options);
    } catch (error) {
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
        { name: "Watch Video", reward: 500, completed: false, emoji: "🎬" },
        { name: "Follow Channel", reward: 1000, completed: true, emoji: "📢" },
        { name: "Share Post", reward: 750, completed: false, emoji: "🔗" },
      ];

      const message = MessageFormatter.tasksMessage(tasks, true);
      await ctx.reply(message.text, message.options);
    } catch (error) {
      const errorMsg = MessageFormatter.errorMessage(
        "Tasks Error",
        "Could not load tasks"
      );
      await ctx.reply(errorMsg.text, errorMsg.options);
    }
  });

  // /help - Beautiful help menu
  bot.command("help", async (ctx) => {
    const message = MessageFormatter.helpMessage();
    await ctx.reply(message.text, message.options);
  });

  // /lang - Language selection
  bot.command("lang", async (ctx) => {
    const message = MessageFormatter.languageSelectionMessage();
    await ctx.reply(message.text, message.options);
  });

  // ============ CALLBACK HANDLERS ============

  // Menu navigation
  bot.callbackQuery("menu", async (ctx) => {
    const message = MessageFormatter.mainMenuMessage();
    await ctx.editMessageText(message.text, message.options);
    await ctx.answerCallbackQuery();
  });

  // Profile view
  bot.callbackQuery("profile", async (ctx) => {
    try {
      const profile: UserProfile = {
        username: "Player",
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
    } catch (error) {
      await ctx.answerCallbackQuery({
        text: "Error loading profile",
        show_alert: true,
      });
    }
    await ctx.answerCallbackQuery();
  });

  // Leaderboard view
  bot.callbackQuery("top", async (ctx) => {
    try {
      const entries: LeaderboardEntry[] = [
        { rank: 1, username: "Champion", score: 500000 },
        { rank: 2, username: "Master", score: 450000 },
        { rank: 3, username: "Expert", score: 400000 },
      ];

      const message = MessageFormatter.leaderboardMessage(entries, 1);
      await ctx.editMessageText(message.text, message.options);
    } catch (error) {
      await ctx.answerCallbackQuery({
        text: "Error loading leaderboard",
        show_alert: true,
      });
    }
    await ctx.answerCallbackQuery();
  });

  // Tasks view
  bot.callbackQuery("tasks", async (ctx) => {
    try {
      const tasks: TaskEntry[] = [
        { name: "Daily Check-in", reward: 100, completed: false },
        { name: "Invite Friend", reward: 500, completed: true },
        { name: "Social Share", reward: 250, completed: false },
      ];

      const message = MessageFormatter.tasksMessage(tasks, false);
      await ctx.editMessageText(message.text, message.options);
    } catch (error) {
      await ctx.answerCallbackQuery({
        text: "Error loading tasks",
        show_alert: true,
      });
    }
    await ctx.answerCallbackQuery();
  });

  // Language selection
  bot.callbackQuery("language", async (ctx) => {
    const message = MessageFormatter.languageSelectionMessage();
    await ctx.editMessageText(message.text, message.options);
    await ctx.answerCallbackQuery();
  });

  // Set language
  bot.callbackQuery(/^lang_/, async (ctx) => {
    const lang = ctx.match.substring(5);
    const successMsg = MessageFormatter.successMessage(
      "Language Updated",
      `Language changed to ${lang.toUpperCase()}`
    );
    await ctx.editMessageText(successMsg.text, successMsg.options);
    await ctx.answerCallbackQuery({
      text: "Language updated! 🌐",
      show_alert: false,
    });
  });

  // Claim task
  bot.callbackQuery("claim_daily", async (ctx) => {
    try {
      const message = MessageFormatter.taskClaimedMessage("Daily Task", 500);
      await ctx.editMessageText(message.text, message.options);
      await ctx.answerCallbackQuery({
        text: "Task claimed! +500 points 🎉",
        show_alert: false,
      });
    } catch (error) {
      await ctx.answerCallbackQuery({
        text: "Failed to claim task",
        show_alert: true,
      });
    }
  });

  // Help menu
  bot.callbackQuery("help", async (ctx) => {
    const message = MessageFormatter.helpMessage();
    await ctx.editMessageText(message.text, message.options);
    await ctx.answerCallbackQuery();
  });

  // Back button
  bot.callbackQuery(/^(back|menu)$/, async (ctx) => {
    const message = MessageFormatter.mainMenuMessage();
    await ctx.editMessageText(message.text, message.options);
    await ctx.answerCallbackQuery();
  });

  // ============ ERROR HANDLING ============

  bot.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      console.error("Bot error:", error);
      const errorMsg = MessageFormatter.errorMessage(
        "Error",
        error instanceof Error ? error.message : "An error occurred"
      );
      try {
        await ctx.reply(errorMsg.text, errorMsg.options);
      } catch {
        console.error("Failed to send error message");
      }
    }
  });

  return bot;
}

/**
 * Export for direct use
 */
export { MessageFormatter, KeyboardDesigner, UIBuilder, ThemeManager };
