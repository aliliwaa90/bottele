/**
 * Message Formatter & Templates
 * Creates pre-formatted message templates for common bot actions
 */

import { UIBuilder } from "./ui-builder.js";
import { KeyboardDesigner } from "./keyboard-designer.js";
import { EmojiPack } from "./theme.js";

export interface UserProfile {
  username: string;
  level?: number;
  points?: number;
  energy?: number;
  rank?: number;
  totalTaps?: number;
  combo?: number;
  pph?: number;
  autoTap?: number;
  tapPower?: number;
  lastUpdate?: Date;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

export interface TaskEntry {
  name: string;
  reward: number;
  completed: boolean;
  emoji?: string;
}

export interface ReferralStats {
  code: string;
  level1Count: number;
  level2Count: number;
  level1Bonus: number;
  level2Bonus: number;
  estimatedReward: number;
}

export interface UpgradeItem {
  id: string;
  name: string;
  current: number;
  next: number;
  cost: number;
  emoji?: string;
}

export class MessageFormatter {
  /**
   * Welcome message for new users
   */
  static welcomeMessage(username: string, invitedBy?: string): {
    text: string;
    options: any;
  } {
    const lines = [
      UIBuilder.welcomeBanner(username),
      "",
      UIBuilder.featureShowcase(),
    ];

    if (invitedBy) {
      lines.push("");
      lines.push(
        UIBuilder.alert(
          "success",
          `Welcome! You were invited by <code>${invitedBy}</code>`
        )
      );
    }

    return {
      text: lines.join("\n"),
      options: {
        reply_markup: KeyboardDesigner.mainMenu(),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Main menu message
   */
  static mainMenuMessage(): { text: string; options: any } {
    const text = [
      UIBuilder.header("VaultTap Main Menu", "🎮"),
      UIBuilder.divider(),
      EmojiPack.rocket + " Tap, earn, and climb the leaderboard!",
      "",
      "What would you like to do?",
    ].join("\n");

    return {
      text,
      options: {
        reply_markup: KeyboardDesigner.mainMenu(),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Profile message
   */
  static profileMessage(profile: UserProfile): { text: string; options: any } {
    return {
      text: UIBuilder.profileCard(profile.username, profile),
      options: {
        reply_markup: KeyboardDesigner.profileActions(),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Leaderboard message
   */
  static leaderboardMessage(entries: LeaderboardEntry[], page: number = 1): {
    text: string;
    options: any;
  } {
    const maxPages = Math.ceil(entries.length / 10);
    const pageEntries = entries.slice((page - 1) * 10, page * 10);

    return {
      text: UIBuilder.leaderboard("Global Leaderboard", pageEntries),
      options: {
        reply_markup: KeyboardDesigner.leaderboardPagination(page, maxPages),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Tasks message
   */
  static tasksMessage(tasks: TaskEntry[], canClaim: boolean = true): {
    text: string;
    options: any;
  } {
    return {
      text: UIBuilder.taskList("Available Tasks", tasks),
      options: {
        reply_markup: KeyboardDesigner.taskActions(canClaim),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Referrals message
   */
  static referralsMessage(stats: ReferralStats): { text: string; options: any } {
    const username = "Player";

    return {
      text: UIBuilder.referralCard(username, stats),
      options: {
        reply_markup: KeyboardDesigner.referralActions(),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Stars shop message
   */
  static starsShopMessage(upgrades: UpgradeItem[]): {
    text: string;
    options: any;
  } {
    const header = UIBuilder.header("Stars Shop", EmojiPack.stars);
    const upgradeCards = upgrades.map((u) =>
      UIBuilder.upgradeCard(u.name, u.current, u.next, u.cost, u.emoji)
    );

    const text = [header, UIBuilder.divider(), ...upgradeCards].join("\n");

    return {
      text,
      options: {
        reply_markup: KeyboardDesigner.starsShop(upgrades.map(u => ({ id: u.id, name: u.name }))),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Language selection message
   */
  static languageSelectionMessage(): { text: string; options: any } {
    const text = [
      UIBuilder.header("Select Your Language", "🌐"),
      UIBuilder.divider(),
      "Choose your preferred language:",
      "",
      "🇸🇦 العربية (Arabic)",
      "🇬🇧 English",
      "🇷🇺 Русский (Russian)",
      "🇹🇷 Türkçe (Turkish)",
      "🇪🇸 Español (Spanish)",
      "🇮🇷 فارسی (Persian)",
      "🇮🇩 Indonesia",
    ].join("\n");

    return {
      text,
      options: {
        reply_markup: KeyboardDesigner.languageSelection(),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Help message
   */
  static helpMessage(): { text: string; options: any } {
    return {
      text: UIBuilder.helpSection(),
      options: {
        reply_markup: KeyboardDesigner.backButton(),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Success message
   */
  static successMessage(title: string, message: string): {
    text: string;
    options: any;
  } {
    return {
      text: [
        UIBuilder.success(title),
        UIBuilder.divider(),
        message,
      ].join("\n"),
      options: {
        reply_markup: KeyboardDesigner.backButton(),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Error message
   */
  static errorMessage(title: string, message: string): {
    text: string;
    options: any;
  } {
    return {
      text: [
        UIBuilder.error(title),
        UIBuilder.divider(),
        message,
      ].join("\n"),
      options: {
        reply_markup: KeyboardDesigner.backButton(),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Loading message
   */
  static loadingMessage(message: string): { text: string; options: any } {
    return {
      text: UIBuilder.loading(message),
      options: {
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Task claimed message
   */
  static taskClaimedMessage(taskName: string, reward: number): {
    text: string;
    options: any;
  } {
    return {
      text: [
        UIBuilder.success("Task Completed!"),
        UIBuilder.divider(),
        `${EmojiPack.check} <b>${taskName}</b>`,
        `${EmojiPack.coin} <b>Reward:</b> <code>+${reward} points</code>`,
        "",
        "Come back tomorrow for more tasks!",
      ].join("\n"),
      options: {
        reply_markup: KeyboardDesigner.taskActions(false),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Payment confirmation message
   */
  static paymentConfirmationMessage(
    upgradeName: string,
    cost: number
  ): { text: string; options: any } {
    return {
      text: [
        UIBuilder.header("Confirm Payment", EmojiPack.money),
        UIBuilder.divider(),
        `Are you sure you want to purchase:`,
        "",
        `${EmojiPack.stars} <b>${upgradeName}</b>`,
        `${EmojiPack.money} <b>Cost:</b> <code>${cost} Stars</code>`,
      ].join("\n"),
      options: {
        reply_markup: KeyboardDesigner.confirmation("stars_confirm", "menu"),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Stats overview message
   */
  static statsOverviewMessage(stats: Record<string, string | number>): {
    text: string;
    options: any;
  } {
    const statsLines = Object.entries(stats).map(
      ([key, value]) =>
        `${EmojiPack.chart} <b>${key}:</b> <code>${value}</code>`
    );

    return {
      text: [
        UIBuilder.header("Quick Stats", "📊"),
        UIBuilder.divider(),
        ...statsLines,
      ].join("\n"),
      options: {
        reply_markup: KeyboardDesigner.quickActions(),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Invite link message
   */
  static inviteLinkMessage(inviteUrl?: string, referralCode?: string): {
    text: string;
    options: any;
  } {
    const lines = [
      UIBuilder.header("Share & Earn", "🔗"),
      UIBuilder.divider(),
      "Invite your friends to VaultTap and earn rewards!",
      "",
    ];

    if (inviteUrl) {
      lines.push(`${EmojiPack.link} <b>Invite Link:</b>`, `<code>${inviteUrl}</code>`, "");
    } else {
      lines.push(
        UIBuilder.alert("warning", "Invite links are not yet configured.")
      );
    }

    if (referralCode) {
      lines.push(`${EmojiPack.clipboard} <b>Referral Code:</b>`);
      lines.push(`<code>${referralCode}</code>`);
    }

    return {
      text: lines.join("\n"),
      options: {
        reply_markup: KeyboardDesigner.inviteKeyboard(inviteUrl),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Feature announcement message
   */
  static announcementMessage(title: string, content: string, emoji = "📢"): {
    text: string;
    options: any;
  } {
    return {
      text: [
        UIBuilder.header(title, emoji),
        UIBuilder.divider(),
        content,
      ].join("\n"),
      options: {
        reply_markup: KeyboardDesigner.backButton(),
        parse_mode: "HTML",
      },
    };
  }

  /**
   * Mini app ready message
   */
  static miniAppReadyMessage(miniAppUrl: string): {
    text: string;
    options: any;
  } {
    return {
      text: [
        UIBuilder.header("Ready to Play!", EmojiPack.game),
        UIBuilder.divider(),
        "Tap the button below to open the VaultTap Mini App and start earning!",
        "",
        `${EmojiPack.rocket} Click the button to launch the game`,
      ].join("\n"),
      options: {
        reply_markup: KeyboardDesigner.webApp(miniAppUrl),
        parse_mode: "HTML",
      },
    };
  }
}
