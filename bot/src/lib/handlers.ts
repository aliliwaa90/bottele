
/**
 * VaultTap Bot - Enhanced Handler Examples
 * 
 * This file shows how to integrate the beautiful UI system into your bot handlers.
 * These are reference implementations you can adapt to your needs.
 */

import { Context, Bot, InlineKeyboard } from "grammy";
import { MessageFormatter, type UserProfile, type LeaderboardEntry, type TaskEntry, type ReferralStats } from "./message-formatter.js";
import { KeyboardDesigner } from "./keyboard-designer.js";
import { UIBuilder } from "./ui-builder.js";
import { EmojiPack } from "./theme.js";

/**
 * Enhanced Profile Handler
 * Shows a beautifully formatted user profile
 */
export async function handleProfileCommand(
  ctx: Context,
  data: any,
  t: (key: string) => string
) {
  try {
    const profile: UserProfile = {
      username: data.user.username || "Anonymous",
      level: data.user.level || 1,
      points: data.user.points,
      energy: data.user.energy,
      rank: data.user.rank,
      totalTaps: data.user.totalTaps,
      combo: data.user.comboMultiplier?.toFixed(2),
      pph: data.user.pph,
      autoTap: data.user.autoTapPerHour,
      tapPower: data.user.tapPower,
    };

    const message = MessageFormatter.profileMessage(profile);
    await ctx.editMessageText(message.text, {
      ...message.options,
      reply_markup: KeyboardDesigner.profileActions(),
    });
  } catch (error) {
    const errorMsg = MessageFormatter.errorMessage(
      t("actionFailed"),
      error instanceof Error ? error.message : "Unknown error"
    );
    await ctx.reply(errorMsg.text, errorMsg.options);
  }
}

/**
 * Enhanced Leaderboard Handler
 * Shows global leaderboard with pagination
 */
export async function handleLeaderboardCommand(
  ctx: Context,
  data: any,
  page: number = 1,
  t: (key: string) => string
) {
  try {
    if (!data || data.length === 0) {
      await ctx.reply(t("topEmpty"), {
        reply_markup: KeyboardDesigner.backButton(),
      });
      return;
    }

    const entries: LeaderboardEntry[] = data.map((item: any, idx: number) => ({
      rank: idx + 1,
      username: item.name || `Player ${idx + 1}`,
      score: item.points || 0,
    }));

    const message = MessageFormatter.leaderboardMessage(entries, page);
    await ctx.editMessageText(message.text, message.options);
  } catch (error) {
    const errorMsg = MessageFormatter.errorMessage(
      "Leaderboard Error",
      "Failed to load leaderboard"
    );
    await ctx.reply(errorMsg.text, errorMsg.options);
  }
}

/**
 * Enhanced Tasks Handler
 * Shows available daily tasks
 */
export async function handleTasksCommand(
  ctx: Context,
  data: any,
  userHasClaimedDaily: boolean = false,
  t: (key: string) => string
) {
  try {
    if (!data.tasks || data.tasks.length === 0) {
      await ctx.reply(t("noTasks"), {
        reply_markup: KeyboardDesigner.backButton(),
      });
      return;
    }

    const tasks: TaskEntry[] = data.tasks.map((task: any) => ({
      name: task.name,
      reward: task.reward || 0,
      completed: task.completed || false,
      emoji: task.emoji || "✅",
    }));

    const message = MessageFormatter.tasksMessage(tasks, !userHasClaimedDaily);
    await ctx.editMessageText(message.text, message.options);
  } catch (error) {
    const errorMsg = MessageFormatter.errorMessage(
      t("actionFailed"),
      "Could not load tasks"
    );
    await ctx.reply(errorMsg.text, errorMsg.options);
  }
}

/**
 * Enhanced Task Claim Handler
 * Handles daily task claim with beautiful success message
 */
export async function handleTaskClaim(
  ctx: Context,
  taskName: string,
  reward: number,
  success: boolean
) {
  try {
    if (success) {
      const message = MessageFormatter.taskClaimedMessage(taskName, reward);
      await ctx.reply(message.text, message.options);
    } else {
      const errorMsg = MessageFormatter.errorMessage(
        "Task Claim Failed",
        "This task has already been claimed. Come back tomorrow!"
      );
      await ctx.reply(errorMsg.text, errorMsg.options);
    }
  } catch (error) {
    const errorMsg = MessageFormatter.errorMessage(
      "Error",
      "Failed to process task claim"
    );
    await ctx.reply(errorMsg.text, errorMsg.options);
  }
}

/**
 * Enhanced Referrals Handler
 * Shows referral statistics and earnings
 */
export async function handleReferralsCommand(
  ctx: Context,
  data: any,
  t: (key: string) => string
) {
  try {
    const stats: ReferralStats = {
      code: data.user.referralCode || "N/A",
      level1Count: data.referrals?.level1?.count || 0,
      level2Count: data.referrals?.level2?.count || 0,
      level1Bonus: data.referrals?.level1?.bonus || 5,
      level2Bonus: data.referrals?.level2?.bonus || 2,
      estimatedReward: data.referrals?.estimatedReward || 0,
    };

    const message = MessageFormatter.referralsMessage(stats);
    await ctx.editMessageText(message.text, message.options);
  } catch (error) {
    const errorMsg = MessageFormatter.errorMessage(
      t("actionFailed"),
      "Could not load referral stats"
    );
    await ctx.reply(errorMsg.text, errorMsg.options);
  }
}

/**
 * Enhanced Stars Shop Handler
 * Shows available upgrades purchasable with Telegram Stars
 */
export async function handleStarsShopCommand(
  ctx: Context,
  data: any,
  t: (key: string) => string
) {
  try {
    if (!data || data.length === 0) {
      await ctx.reply(t("starsEmpty"), {
        reply_markup: KeyboardDesigner.backButton(),
      });
      return;
    }

    const upgrades = data.map((upgrade: any) => ({
      id: upgrade.id,
      name: upgrade.name,
      current: upgrade.currentLevel || 1,
      next: (upgrade.currentLevel || 1) + 1,
      cost: upgrade.cost,
      emoji: upgrade.emoji || "⭐",
    }));

    const message = MessageFormatter.starsShopMessage(upgrades);
    await ctx.editMessageText(message.text, message.options);
  } catch (error) {
    const errorMsg = MessageFormatter.errorMessage(
      t("actionFailed"),
      "Could not load stars shop"
    );
    await ctx.reply(errorMsg.text, errorMsg.options);
  }
}

/**
 * Enhanced Language Selection Handler
 * Allow users to choose their preferred language
 */
export async function handleLanguageCommand(ctx: Context) {
  try {
    const message = MessageFormatter.languageSelectionMessage();
    await ctx.editMessageText(message.text, message.options);
  } catch (error) {
    await ctx.reply("Failed to load language selection", {
      reply_markup: KeyboardDesigner.backButton(),
    });
  }
}

/**
 * Enhanced Help Command Handler
 * Display all available commands
 */
export async function handleHelpCommand(ctx: Context) {
  try {
    const message = MessageFormatter.helpMessage();
    await ctx.reply(message.text, message.options);
  } catch (error) {
    await ctx.reply("Failed to load help", {
      reply_markup: KeyboardDesigner.backButton(),
    });
  }
}

/**
 * Enhanced Main Menu Handler
 * Central hub for navigation
 */
export async function handleMainMenu(ctx: Context, t: (key: string) => string) {
  try {
    const lines = [
      UIBuilder.header("VaultTap Control Center", "🎮"),
      UIBuilder.divider(),
      `${EmojiPack.rocket} Ready to earn? Open the mini app and start tapping!`,
      "",
      `${EmojiPack.chart} View your stats anytime`,
      `${EmojiPack.trophy} Compete on the global leaderboard`,
      `${EmojiPack.stars} Unlock premium features with Stars`,
    ];

    await ctx.editMessageText(lines.join("\n"), {
      reply_markup: KeyboardDesigner.mainMenu(),
      parse_mode: "HTML",
    });
  } catch (error) {
    const message = MessageFormatter.mainMenuMessage();
    await ctx.reply(message.text, message.options);
  }
}

/**
 * Enhanced Invite Handler
 * Handle referral link sharing
 */
export async function handleInviteCommand(
  ctx: Context,
  referralCode: string,
  botUsername: string,
  t: (key: string) => string
) {
  try {
    const inviteUrl = botUsername
      ? `https://t.me/${botUsername}?start=${encodeURIComponent(referralCode)}`
      : undefined;

    const message = MessageFormatter.inviteLinkMessage(inviteUrl, referralCode);
    await ctx.editMessageText(message.text, message.options);
  } catch (error) {
    const errorMsg = MessageFormatter.errorMessage(
      "Invite Error",
      "Could not generate invite link"
    );
    await ctx.reply(errorMsg.text, errorMsg.options);
  }
}

/**
 * Enhanced Payment Confirmation Handler
 * Shows confirmation for Star purchase before processing
 */
export async function handlePaymentConfirmation(
  ctx: Context,
  upgradeName: string,
  cost: number
) {
  try {
    const message = MessageFormatter.paymentConfirmationMessage(upgradeName, cost);
    await ctx.editMessageText(message.text, message.options);
  } catch (error) {
    const errorMsg = MessageFormatter.errorMessage(
      "Payment Error",
      "Could not process payment request"
    );
    await ctx.reply(errorMsg.text, errorMsg.options);
  }
}

/**
 * Enhanced Loading State Handler
 * Show loading message while fetching data
 */
export async function showLoadingState(ctx: Context, title: string) {
  try {
    const message = MessageFormatter.loadingMessage(title);
    await ctx.editMessageText(message.text, message.options);
  } catch (error) {
    // Ignore if message can't be edited
  }
}

/**
 * Enhanced Error Handler
 * Centralized error display
 */
export async function handleError(
  ctx: Context,
  error: unknown,
  fallbackMessage: string = "An error occurred"
) {
  const errorMsg = MessageFormatter.errorMessage(
    "Error",
    error instanceof Error ? error.message : fallbackMessage
  );

  try {
    await ctx.editMessageText(errorMsg.text, errorMsg.options);
  } catch {
    await ctx.reply(errorMsg.text, errorMsg.options);
  }
}

/**
 * Enhanced Announcement Handler
 * Post news or updates to users
 */
export async function announceFeature(
  ctx: Context,
  title: string,
  description: string,
  emoji: string = "🎉"
) {
  try {
    const message = MessageFormatter.announcementMessage(title, description, emoji);
    await ctx.reply(message.text, message.options);
  } catch (error) {
    await ctx.reply(`📢 ${title}\n\n${description}`, {
      reply_markup: KeyboardDesigner.backButton(),
    });
  }
}

/**
 * Create Custom Stat Display
 * Example of using UIBuilder for custom layouts
 */
export async function showDailyProgress(
  ctx: Context,
  stats: Record<string, number | string>
) {
  try {
    const lines = [
      UIBuilder.header("Your Daily Progress", "📊"),
      UIBuilder.divider(),
    ];

    Object.entries(stats).forEach(([key, value]) => {
      lines.push(`${EmojiPack.chart} <b>${key}:</b> <code>${value}</code>`);
    });

    await ctx.reply(lines.join("\n"), {
      reply_markup: KeyboardDesigner.backButton(),
      parse_mode: "HTML",
    });
  } catch (error) {
    handleError(ctx, error, "Could not display stats");
  }
}

/**
 * Mini App Ready Message
 * Encourage users to play the mini app
 */
export async function sendMiniAppReady(ctx: Context, miniAppUrl: string) {
  try {
    const message = MessageFormatter.miniAppReadyMessage(miniAppUrl);
    await ctx.reply(message.text, message.options);
  } catch (error) {
    await ctx.reply("🎮 Ready to play! Open the mini app and start earning!", {
      reply_markup: KeyboardDesigner.webApp(miniAppUrl),
    });
  }
}
