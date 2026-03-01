/**
 * VaultTap Bot - UI Integration Guide
 * 
 * This file demonstrates how to use the beautiful UI components in your bot.
 * Copy the examples to update your bot's handlers.
 * 
 * Components available:
 * - UIBuilder: For formatting text messages with styling
 * - KeyboardDesigner: For creating beautiful inline keyboards
 * - MessageFormatter: Pre-formatted templates for common actions
 * - ThemeManager: For managing colors, emojis, and themes
 */

import { UIBuilder } from "./ui-builder.js";
import { KeyboardDesigner } from "./keyboard-designer.js";
import { MessageFormatter, type UserProfile, type LeaderboardEntry, type TaskEntry, type ReferralStats } from "./message-formatter.js";
import { ThemeManager, DarkTheme, LightTheme, ModernTheme } from "./theme.js";

/**
 * EXAMPLE 1: Welcome Message
 * 
 * Old:
 * bot.command("start", async (ctx) => {
 *   await ctx.reply(welcomeMessage(ctx.from.id));
 * });
 * 
 * New:
 */
export function createWelcomeHandler() {
  return async (ctx: any) => {
    // For new users, you can include referral info
    const message = MessageFormatter.welcomeMessage(
      ctx.from.first_name || "User"
      // Optional: ctx.startPayload (referral code)
    );

    await ctx.reply(message.text, message.options);
  };
}

/**
 * EXAMPLE 2: Profile Display
 * 
 * Old:
 * await reply("📊 Your stats\n• Points: " + data.points...);
 * 
 * New:
 */
export async function sendBeautifulProfile(
  userId: number,
  data: any,
  reply: (msg: string, opts: any) => Promise<any>
) {
  const profile: UserProfile = {
    username: data.user.username,
    level: data.user.level || 1,
    points: data.user.points,
    energy: data.user.energy,
    rank: data.user.rank,
    totalTaps: data.user.totalTaps,
    combo: data.user.comboMultiplier,
    pph: data.user.pph,
    autoTap: data.user.autoTapPerHour,
    tapPower: data.user.tapPower,
  };

  const message = MessageFormatter.profileMessage(profile);
  await reply(message.text, message.options);
}

/**
 * EXAMPLE 3: Leaderboard Display
 * 
 * Old:
 * const rows = top.map(item => `${rank} ${item.name} — ${item.points}`).join("\n");
 * await reply("🏆 Leaderboard\n" + rows);
 * 
 * New:
 */
export async function sendBeautifulLeaderboard(
  data: any,
  reply: (msg: string, opts: any) => Promise<any>,
  page: number = 1
) {
  const entries: LeaderboardEntry[] = data.map((item: any, idx: number) => ({
    rank: idx + 1,
    username: item.name,
    score: item.points,
  }));

  const message = MessageFormatter.leaderboardMessage(entries, page);
  await reply(message.text, message.options);
}

/**
 * EXAMPLE 4: Tasks Display
 * 
 * Old:
 * const rows = tasks.map(t => `✅ ${t.name}: +${t.reward}`).join("\n");
 * await reply("Tasks:\n" + rows);
 * 
 * New:
 */
export async function sendBeautifulTasks(
  data: any,
  reply: (msg: string, opts: any) => Promise<any>,
  userHasClaimedDaily: boolean = false
) {
  const tasks: TaskEntry[] = data.tasks.map((task: any) => ({
    name: task.name,
    reward: task.reward,
    completed: task.completed,
    emoji: task.emoji,
  }));

  const message = MessageFormatter.tasksMessage(tasks, !userHasClaimedDaily);
  await reply(message.text, message.options);
}

/**
 * EXAMPLE 5: Referrals Display
 * 
 * Old:
 * await reply("👥 Referrals\n• Code: " + code...);
 * 
 * New:
 */
export async function sendBeautifulReferrals(
  data: any,
  reply: (msg: string, opts: any) => Promise<any>
) {
  const stats: ReferralStats = {
    code: data.user.referralCode,
    level1Count: data.referrals.level1.count,
    level2Count: data.referrals.level2.count,
    level1Bonus: data.referrals.level1.bonus,
    level2Bonus: data.referrals.level2.bonus,
    estimatedReward: data.referrals.estimatedReward,
  };

  const message = MessageFormatter.referralsMessage(stats);
  await reply(message.text, message.options);
}

/**
 * EXAMPLE 6: Stars Shop Display
 * 
 * Old:
 * const rows = upgrades.map(u => `⭐ ${u.name}: ${u.cost} Stars`).join("\n");
 * await reply("Stars Shop:\n" + rows);
 * 
 * New:
 */
export async function sendBeautifulStarsShop(
  available: any[],
  reply: (msg: string, opts: any) => Promise<any>
) {
  const upgrades = available.map((u: any) => ({
    id: u.id,
    name: u.name,
    current: u.currentLevel,
    next: u.nextLevel,
    cost: u.cost,
    emoji: u.emoji || "⭐",
  }));

  const message = MessageFormatter.starsShopMessage(upgrades);
  await reply(message.text, message.options);
}

/**
 * EXAMPLE 7: Custom Message with UI Builder
 * 
 * Sometimes you need to create a custom message not covered by templates.
 * Use UIBuilder directly:
 */
export async function sendCustomStats(
  reply: (msg: string, opts: any) => Promise<any>
) {
  const text = UIBuilder.statBlock("Your Daily Progress", [
    { label: "Taps", value: "1,234", emoji: "👆" },
    { label: "Points Earned", value: "5,678", emoji: "💎" },
    { label: "Energy Used", value: "450/500", emoji: "⚡" },
    { label: "Combo streak", value: "15x", emoji: "🔥" },
  ]);

  await reply(text, {
    reply_markup: KeyboardDesigner.backButton(),
    parse_mode: "HTML",
  });
}

/**
 * EXAMPLE 8: Error & Success Messages
 * 
 * Old:
 * await reply("❌ Error: " + error.message);
 * 
 * New:
 */
export async function sendErrors(
  reply: (msg: string, opts: any) => Promise<any>
) {
  const errorMsg = MessageFormatter.errorMessage(
    "Action Failed",
    "Unable to claim the task. Please try again later. If the issue persists, contact support."
  );

  await reply(errorMsg.text, errorMsg.options);

  // Success example
  const successMsg = MessageFormatter.successMessage(
    "Task Verified!",
    "You have successfully completed the task. Your reward has been added to your account."
  );

  await reply(successMsg.text, successMsg.options);
}

/**
 * EXAMPLE 9: Using Different Themes
 * 
 * Set a theme globally for your bot:
 */
export function setupTheme(themeName: string = "dark") {
  const theme = ThemeManager.getThemeByName(themeName);
  ThemeManager.setTheme(theme);

  // Or use specific themes:
  // ThemeManager.setTheme(DarkTheme);   // Dark theme
  // ThemeManager.setTheme(LightTheme);  // Light theme
  // ThemeManager.setTheme(ModernTheme); // Modern theme
}

/**
 * EXAMPLE 10: Creating a fancy task claimed message
 * 
 * Old:
 * await reply("✅ Task claimed! +100 points");
 * 
 * New:
 */
export async function sendTaskClaimedMessage(
  taskName: string,
  reward: number,
  reply: (msg: string, opts: any) => Promise<any>
) {
  const message = MessageFormatter.taskClaimedMessage(taskName, reward);
  await reply(message.text, message.options);
}

/**
 * EXAMPLE 11: Main Menu Update
 * 
 * Old:
 * return new InlineKeyboard()
 *   .webApp("Open", url)
 *   .row()
 *   .text("Profile", "profile")...
 * 
 * New design-driven approach:
 */
export async function sendMainMenu(
  reply: (msg: string, opts: any) => Promise<any>
) {
  const message = MessageFormatter.mainMenuMessage();
  await reply(message.text, message.options);
}

/**
 * EXAMPLE 12: Help/Commands Display
 */
export async function sendHelpMessage(
  reply: (msg: string, opts: any) => Promise<any>
) {
  const message = MessageFormatter.helpMessage();
  await reply(message.text, message.options);
}

/**
 * INTEGRATION STEPS:
 * 
 * 1. Import the components at the top of your bot file:
 *    import { MessageFormatter } from "./lib/message-formatter.js";
 *    import { KeyboardDesigner } from "./lib/keyboard-designer.js";
 * 
 * 2. Replace your message sending code with formatter calls:
 *    OLD: await reply("📊 Profile\n• Points: " + data.points);
 *    NEW: const msg = MessageFormatter.profileMessage(profile);
 *         await reply(msg.text, msg.options);
 * 
 * 3. Use KeyboardDesigner for all inline keyboards:
 *    OLD: return new InlineKeyboard().text("Profile", "profile").text("Help", "help");
 *    NEW: return KeyboardDesigner.mainMenu();
 * 
 * 4. For custom UI elements, use UIBuilder directly
 * 
 * 5. Optionally set a theme at startup:
 *    ThemeManager.setTheme(DarkTheme);
 * 
 * 6. All messages use HTML parsing by default, so "parse_mode": "HTML" is set
 */

export const IntegrationGuide = {
  examples: {
    welcome: createWelcomeHandler,
    profile: sendBeautifulProfile,
    leaderboard: sendBeautifulLeaderboard,
    tasks: sendBeautifulTasks,
    referrals: sendBeautifulReferrals,
    stars: sendBeautifulStarsShop,
    custom: sendCustomStats,
    errors: sendErrors,
    menu: sendMainMenu,
    help: sendHelpMessage,
  },
};
