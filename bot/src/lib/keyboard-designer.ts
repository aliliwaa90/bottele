/**
 * Advanced Keyboard Layout Designer for VaultTap Bot
 * Creates beautiful, organized inline keyboards
 */

import { InlineKeyboard } from "grammy";

export interface KeyboardButton {
  text: string;
  callback_data: string;
}

export interface KeyboardRow {
  buttons: KeyboardButton[];
}

export class KeyboardDesigner {
  /**
   * Create main menu keyboard
   */
  static mainMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .row()
      .text("🚀 Open Mini App", "mini_app")
      .row()
      .text("👤 Profile", "profile")
      .text("🏆 Leaderboard", "top")
      .row()
      .text("✅ Tasks", "tasks")
      .text("👥 Referrals", "referrals")
      .row()
      .text("⭐ Stars Shop", "stars")
      .row()
      .text("🌐 Language", "language")
      .text("❓ Help", "help");
  }

  /**
   * Create back button row
   */
  static backButton(callback_data = "menu"): InlineKeyboard {
    return new InlineKeyboard().text("⬅️ Back", callback_data);
  }

  /**
   * Create profile action keyboard
   */
  static profileActions(): InlineKeyboard {
    return new InlineKeyboard()
      .row()
      .text("🔄 Refresh", "profile_refresh")
      .text("📊 Stats", "profile_stats")
      .row()
      .text("⬅️ Back", "menu");
  }

  /**
   * Create leaderboard pagination keyboard
   */
  static leaderboardPagination(page: number, maxPages: number): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    if (page > 1) {
      keyboard.text("⬅️ Previous", `top_page_${page - 1}`);
    }

    keyboard.text(`Page ${page}/${maxPages}`, "noop");

    if (page < maxPages) {
      keyboard.text("Next ➡️", `top_page_${page + 1}`);
    }

    keyboard.row().text("⬅️ Back", "menu");
    return keyboard;
  }

  /**
   * Create task actions keyboard
   */
  static taskActions(canClaim: boolean = true): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    if (canClaim) {
      keyboard.text("✅ Claim Daily Task", "claim_daily");
    } else {
      keyboard.text("⏳ Already Claimed", "noop");
    }

    keyboard.row().text("🔄 Refresh", "tasks_refresh").text("⬅️ Back", "menu");
    return keyboard;
  }

  /**
   * Create referral actions keyboard
   */
  static referralActions(): InlineKeyboard {
    return new InlineKeyboard()
      .row()
      .text("🔗 Copy Invite Link", "copy_invite")
      .text("📊 Stats", "ref_stats")
      .row()
      .text("⬅️ Back", "menu");
  }

  /**
   * Create stars shop keyboard
   */
  static starsShop(upgrades: Array<{ id: string; name: string }>): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    upgrades.forEach((upgrade) => {
      keyboard.row().text(`⭐ ${upgrade.name}`, `stars_buy_${upgrade.id}`);
    });

    keyboard.row().text("⬅️ Back", "menu");
    return keyboard;
  }

  /**
   * Create language selection keyboard
   */
  static languageSelection(): InlineKeyboard {
    return new InlineKeyboard()
      .row()
      .text("🇸🇦 عربي", "lang_ar")
      .text("🇬🇧 English", "lang_en")
      .row()
      .text("🇷🇺 Русский", "lang_ru")
      .text("🇹🇷 Türkçe", "lang_tr")
      .row()
      .text("🇪🇸 Español", "lang_es")
      .text("🇮🇷 فارسی", "lang_fa")
      .row()
      .text("🇮🇩 Indonesia", "lang_id")
      .row()
      .text("⬅️ Back", "menu");
  }

  /**
   * Create yes/no confirmation keyboard
   */
  static confirmation(yesCallback = "confirm_yes", noCallback = "confirm_no"): InlineKeyboard {
    return new InlineKeyboard()
      .text("✅ Yes", yesCallback)
      .text("❌ No", noCallback);
  }

  /**
   * Create rating/feedback keyboard
   */
  static rating(baseCallback = "rate"): InlineKeyboard {
    return new InlineKeyboard()
      .row()
      .text("⭐", `${baseCallback}_1`)
      .text("⭐⭐", `${baseCallback}_2`)
      .text("⭐⭐⭐", `${baseCallback}_3`)
      .text("⭐⭐⭐⭐", `${baseCallback}_4`)
      .text("⭐⭐⭐⭐⭐", `${baseCallback}_5`)
      .row()
      .text("⬅️ Back", "menu");
  }

  /**
   * Create empty state keyboard
   */
  static emptyState(): InlineKeyboard {
    return new InlineKeyboard()
      .row()
      .text("🔄 Refresh", "refresh")
      .text("⬅️ Back", "menu");
  }

  /**
   * Create quick actions keyboard
   */
  static quickActions(): InlineKeyboard {
    return new InlineKeyboard()
      .row()
      .text("💎 Open App", "mini_app")
      .text("🏆 Top 10", "top")
      .row()
      .text("✅ Tasks", "tasks")
      .text("👥 Referrals", "referrals")
      .row()
      .text("⬅️ Back", "menu");
  }

  /**
   * Create web app button
   */
  static webApp(url: string, text = "🚀 Open VaultTap"): InlineKeyboard {
    return new InlineKeyboard()
      .webApp(text, url)
      .row()
      .text("⬅️ Back", "menu");
  }

  /**
   * Create custom keyboard
   */
  static custom(buttons: KeyboardRow[]): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    buttons.forEach((row) => {
      keyboard.row();
      row.buttons.forEach((btn) => {
        keyboard.text(btn.text, btn.callback_data);
      });
    });

    return keyboard;
  }

  /**
   * Create invite link keyboard
   */
  static inviteKeyboard(inviteUrl?: string): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    if (inviteUrl) {
      keyboard.url("🔗 Share Invite Link", inviteUrl);
    } else {
      keyboard.text("🔗 Share Link", "missing_username");
    }

    keyboard.row().text("📋 Copy Code", "copy_ref_code").text("⬅️ Back", "menu");
    return keyboard;
  }

  /**
   * Create payment confirmation keyboard
   */
  static paymentConfirmation(orderId: string): InlineKeyboard {
    return new InlineKeyboard()
      .text("✅ Confirm Payment", `confirm_payment_${orderId}`)
      .text("❌ Cancel", "menu");
  }

  /**
   * Create inline menu navigation
   */
  static tabNavigation(tabs: Array<{ name: string; id: string }>, activeTab: string): InlineKeyboard {
    const keyboard = new InlineKeyboard();
    keyboard.row();

    tabs.forEach((tab) => {
      const isActive = tab.id === activeTab;
      const text = isActive ? `● ${tab.name}` : tab.name;
      keyboard.text(text, `tab_${tab.id}`);
    });

    keyboard.row().text("⬅️ Back", "menu");
    return keyboard;
  }

  /**
   * Create stats comparison keyboard
   */
  static statsComparison(): InlineKeyboard {
    return new InlineKeyboard()
      .row()
      .text("👤 Personal", "stats_personal")
      .text("🏆 Global", "stats_global")
      .row()
      .text("📈 Trends", "stats_trends")
      .text("⬅️ Back", "menu");
  }

  /**
   * No-operation button (for disabled buttons)
   */
  static noop(): InlineKeyboard {
    return new InlineKeyboard().text("⏳ Loading...", "noop");
  }
}
