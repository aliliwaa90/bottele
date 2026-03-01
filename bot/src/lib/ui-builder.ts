/**
 * Advanced UI Builder for VaultTap Telegram Bot
 * Creates beautiful, formatted messages with visual components
 */

export class UIBuilder {
  /**
   * Create a styled header
   */
  static header(title: string, emoji = "🎮"): string {
    return `<b>${emoji} ${title}</b>`;
  }

  /**
   * Create a divider line
   */
  static divider(): string {
    return "━━━━━━━━━━━━━━━━━━━━━━";
  }

  /**
   * Create a progress bar
   */
  static progressBar(
    current: number,
    max: number,
    width: number = 10,
    emoji = "⚡"
  ): string {
    const percentage = Math.min(current / max, 1);
    const filled = Math.round(width * percentage);
    const empty = width - filled;

    const bar = "▰".repeat(filled) + "▱".repeat(empty);
    const percent = Math.round(percentage * 100);

    return `${bar} ${percent}%`;
  }

  /**
   * Create a stat row
   */
  static statRow(label: string, value: string | number, emoji = "📊"): string {
    return `${emoji} <b>${label}:</b> <code>${value}</code>`;
  }

  /**
   * Create a stat block with multiple stats
   */
  static statBlock(title: string, stats: Array<{ label: string; value: string | number; emoji?: string }>): string {
    const header = this.header(title);
    const rows = stats.map(
      (stat) => this.statRow(stat.label, stat.value, stat.emoji)
    );
    return [header, this.divider(), ...rows].join("\n");
  }

  /**
   * Create a leaderboard entry
   */
  static leaderboardEntry(
    rank: number,
    username: string,
    score: number,
    medal = true
  ): string {
    const medals = ["🥇", "🥈", "🥉"];
    const medal_emoji = medal && rank <= 3 ? medals[rank - 1] : `#${rank}`;
    return `${medal_emoji} <b>${username}</b> · <code>${score.toLocaleString()}</code>`;
  }

  /**
   * Create a leaderboard
   */
  static leaderboard(
    title: string,
    entries: Array<{ rank: number; username: string; score: number }>
  ): string {
    const header = this.header(title, "🏆");
    const leaderboard_entries = entries.map((e) =>
      this.leaderboardEntry(e.rank, e.username, e.score)
    );
    return [header, this.divider(), ...leaderboard_entries].join("\n");
  }

  /**
   * Create a task card
   */
  static taskCard(
    name: string,
    reward: number,
    completed: boolean,
    emoji = "✅"
  ): string {
    const status = completed ? "✔️ <code>تم</code>" : "⏳ <code>متاح</code>";
    return `${emoji} <b>${name}</b>\n   💰 ${reward} · ${status}`;
  }

  /**
   * Create a task list
   */
  static taskList(title: string, tasks: Array<{ name: string; reward: number; completed: boolean; emoji?: string }>): string {
    const header = this.header(title, "✅");
    const task_items = tasks.map((t) =>
      this.taskCard(t.name, t.reward, t.completed, t.emoji)
    );
    return [header, this.divider(), ...task_items].join("\n");
  }

  /**
   * Create a user profile card
   */
  static profileCard(
    username: string,
    stats: {
      level?: number;
      points?: number;
      energy?: number;
      rank?: number;
      totalTaps?: number;
      combo?: number;
      pph?: number;
      autoTap?: number;
      tapPower?: number;
    }
  ): string {
    const lines = [
      this.header(`${username}`, "👤"),
      this.divider(),
    ];

    if (stats.level) {
      lines.push(`⚔️ <b>Level:</b> <code>${stats.level}</code>`);
    }
    if (stats.rank) {
      lines.push(`🏅 <b>Rank:</b> <code>#${stats.rank}</code>`);
    }

    lines.push("");

    if (stats.points !== undefined) {
      lines.push(
        `💎 <b>Points:</b> <code>${stats.points.toLocaleString()}</code>`
      );
    }
    if (stats.totalTaps !== undefined) {
      lines.push(
        `👆 <b>Total Taps:</b> <code>${stats.totalTaps.toLocaleString()}</code>`
      );
    }
    if (stats.combo !== undefined) {
      lines.push(`🔥 <b>Combo:</b> <code>${stats.combo}x</code>`);
    }

    lines.push("");

    if (stats.energy !== undefined) {
      lines.push(`⚡ <b>Energy:</b> <code>${stats.energy}</code>`);
    }
    if (stats.tapPower !== undefined) {
      lines.push(`💪 <b>Tap Power:</b> <code>${stats.tapPower}</code>`);
    }
    if (stats.autoTap !== undefined) {
      lines.push(`🤖 <b>Auto Tap/H:</b> <code>${stats.autoTap}</code>`);
    }
    if (stats.pph !== undefined) {
      lines.push(`📈 <b>PPH:</b> <code>${stats.pph}</code>`);
    }

    return lines.join("\n");
  }

  /**
   * Create a referral stats card
   */
  static referralCard(
    username: string,
    stats: {
      code: string;
      level1Count: number;
      level2Count: number;
      level1Bonus: number;
      level2Bonus: number;
      estimatedReward: number;
    }
  ): string {
    return [
      this.header(`${username} - Referral Stats`, "👥"),
      this.divider(),
      `📌 <b>Code:</b> <code>${stats.code}</code>`,
      "",
      `👫 <b>Level 1:</b> <code>${stats.level1Count}</code> users`,
      `📊 <b>Reward:</b> <code>+${stats.level1Bonus}% per invite</code>`,
      "",
      `👨‍👩‍👧‍👦 <b>Level 2:</b> <code>${stats.level2Count}</code> users`,
      `📊 <b>Reward:</b> <code>+${stats.level2Bonus}% per invite</code>`,
      "",
      this.divider(),
      `💰 <b>Est. Rewards:</b> <code>${stats.estimatedReward.toLocaleString()}</code>`,
    ].join("\n");
  }

  /**
   * Create an upgrade card
   */
  static upgradeCard(
    name: string,
    current: number,
    next: number,
    cost: number,
    emoji = "⭐"
  ): string {
    return [
      `${emoji} <b>${name}</b>`,
      `   Lvl: ${current} → ${next}`,
      `   💰 Cost: ${cost} Stars`,
    ].join("\n");
  }

  /**
   * Create a section with custom content
   */
  static section(title: string, content: string, emoji = "📌"): string {
    return [
      this.header(title, emoji),
      this.divider(),
      content,
    ].join("\n");
  }

  /**
   * Create an alert/notification
   */
  static alert(type: "info" | "success" | "warning" | "error", message: string): string {
    const icons = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
    };
    return `${icons[type]} <b>${message}</b>`;
  }

  /**
   * Create a welcome banner
   */
  static welcomeBanner(username: string): string {
    return [
      "╔═══════════════════════════════╗",
      `║   🚀 Welcome ${username}! 🚀      ║`,
      "║                               ║",
      "║  💎 VaultTap Tap-to-Earn Bot  ║",
      "║                               ║",
      "╚═══════════════════════════════╝",
    ].join("\n");
  }

  /**
   * Create a feature showcase
   */
  static featureShowcase(): string {
    return [
      this.header("VaultTap Features", "🌟"),
      this.divider(),
      "🎮 <b>Tap-to-Earn</b> - Tap and earn points",
      "📈 <b>Upgrades</b> - Boost your earnings",
      "👥 <b>Referrals</b> - Invite friends for rewards",
      "✅ <b>Daily Tasks</b> - Complete for bonuses",
      "🏆 <b>Leaderboard</b> - Compete with others",
      "⭐ <b>Telegram Stars</b> - Premium upgrades",
      "🌐 <b>Multi-language</b> - 7+ languages",
    ].join("\n");
  }

  /**
   * Format large numbers
   */
  static formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + "K";
    }
    return num.toString();
  }

  /**
   * Create a mini stats bar
   */
  static miniStats(stats: Record<string, number | string>): string {
    return Object.entries(stats)
      .map(([key, value]) => `<code>${key}</code>: ${value}`)
      .join(" • ");
  }

  /**
   * Create a button-like text element
   */
  static button(text: string, emoji = "▶️"): string {
    return `${emoji} <b>${text}</b>`;
  }

  /**
   * Create a help section
   */
  static helpSection(): string {
    return [
      this.header("Commands", "❓"),
      this.divider(),
      this.button("/start", "⚙️") + " - Start the bot",
      this.button("/menu", "📱") + " - Main menu",
      this.button("/profile", "👤") + " - View your profile",
      this.button("/top", "🏆") + " - Global leaderboard",
      this.button("/tasks", "✅") + " - Daily tasks",
      this.button("/ref", "👥") + " - Referral stats",
      this.button("/invite", "🔗") + " - Get invite link",
      this.button("/stars", "⭐") + " - Stars shop",
      this.button("/lang", "🌐") + " - Change language",
      this.button("/help", "❓") + " - Show this menu",
    ].join("\n");
  }

  /**
   * Create a loading animation message
   */
  static loading(message: string): string {
    return `⏳ <b>${message}</b>...`;
  }

  /**
   * Create an error message
   */
  static error(message: string): string {
    return this.alert("error", message);
  }

  /**
   * Create a success message
   */
  static success(message: string): string {
    return this.alert("success", message);
  }
}
