/**
 * VaultTap Bot Theme System
 * Manages colors, emojis, and styling preferences
 */

export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  emojis: {
    primary: string;
    menu: string;
    profile: string;
    leaderboard: string;
    tasks: string;
    referrals: string;
    stars: string;
    language: string;
    help: string;
    game: string;
    success: string;
    error: string;
    warning: string;
    loading: string;
  };
  formatting: {
    headerStyle: "bold" | "markdown" | "both";
    dividerStyle: "ascii" | "unicode" | "simple";
    numberFormat: "comma" | "short";
  };
}

export const DarkTheme: ThemeConfig = {
  colors: {
    primary: "🎮",
    secondary: "💎",
    success: "✅",
    warning: "⚠️",
    danger: "❌",
    info: "ℹ️",
  },
  emojis: {
    primary: "🚀",
    menu: "📱",
    profile: "👤",
    leaderboard: "🏆",
    tasks: "✅",
    referrals: "👥",
    stars: "⭐",
    language: "🌐",
    help: "❓",
    game: "🎮",
    success: "✅",
    error: "❌",
    warning: "⚠️",
    loading: "⏳",
  },
  formatting: {
    headerStyle: "bold",
    dividerStyle: "unicode",
    numberFormat: "comma",
  },
};

export const LightTheme: ThemeConfig = {
  colors: {
    primary: "🎮",
    secondary: "💎",
    success: "✅",
    warning: "⚠️",
    danger: "❌",
    info: "ℹ️",
  },
  emojis: {
    primary: "🌟",
    menu: "📋",
    profile: "🧑",
    leaderboard: "🥇",
    tasks: "🎯",
    referrals: "🤝",
    stars: "✨",
    language: "🗺️",
    help: "🤔",
    game: "🎪",
    success: "👍",
    error: "👎",
    warning: "⚡",
    loading: "🔄",
  },
  formatting: {
    headerStyle: "both",
    dividerStyle: "simple",
    numberFormat: "short",
  },
};

export const ModernTheme: ThemeConfig = {
  colors: {
    primary: "🎮",
    secondary: "💎",
    success: "✅",
    warning: "⚠️",
    danger: "❌",
    info: "ℹ️",
  },
  emojis: {
    primary: "▶️",
    menu: "◆",
    profile: "◉",
    leaderboard: "◆◆◆",
    tasks: "▪",
    referrals: "◆◆",
    stars: "★",
    language: "◉",
    help: "◎",
    game: "▶",
    success: "✓",
    error: "✕",
    warning: "⚡",
    loading: "⟳",
  },
  formatting: {
    headerStyle: "bold",
    dividerStyle: "ascii",
    numberFormat: "short",
  },
};

/**
 * Theme Manager
 */
export class ThemeManager {
  private static currentTheme: ThemeConfig = DarkTheme;

  static setTheme(theme: ThemeConfig): void {
    this.currentTheme = theme;
  }

  static getTheme(): ThemeConfig {
    return this.currentTheme;
  }

  static getEmoji(key: keyof ThemeConfig["emojis"]): string {
    return this.currentTheme.emojis[key];
  }

  static getColor(key: keyof ThemeConfig["colors"]): string {
    return this.currentTheme.colors[key];
  }

  /**
   * Get theme by name
   */
  static getThemeByName(name: string): ThemeConfig {
    const themes: Record<string, ThemeConfig> = {
      dark: DarkTheme,
      light: LightTheme,
      modern: ModernTheme,
    };
    return themes[name] || DarkTheme;
  }
}

/**
 * Emoji Pack for quick access
 */
export const EmojiPack = {
  // Games & Activities
  game: "🎮",
  controller: "🕹️",
  puzzle: "🧩",
  dice: "🎲",
  cards: "🃏",
  trophy: "🏆",
  medal: "🏅",
  goldMedal: "🥇",
  silverMedal: "🥈",
  bronzeMedal: "🥉",

  // Currency & Points
  gem: "💎",
  points: "⭐",
  coin: "🪙",
  money: "💰",
  stars: "✨",
  fire: "🔥",

  // Status
  check: "✅",
  cross: "❌",
  warn: "⚠️",
  info: "ℹ️",
  loading: "⏳",
  clock: "⏰",
  hourglass: "⌛",

  // Actions
  start: "▶️",
  stop: "⏹️",
  forward: "⏭️",
  back: "⏮️",
  up: "⬆️",
  down: "⬇️",
  left: "⬅️",
  right: "➡️",

  // Users
  user: "👤",
  users: "👥",
  admin: "👨‍💼",
  developer: "👨‍💻",
  hacker: "🧑‍💻",

  // Social
  link: "🔗",
  share: "📤",
  invite: "📨",
  message: "💬",
  mail: "📧",

  // Statistics
  chart: "📊",
  graph: "📈",
  down_graph: "📉",
  stats: "📋",
  clipboard: "📋",

  // UI
  menu: "📱",
  settings: "⚙️",
  gear: "⚙️",
  tools: "🛠️",
  tool: "🔧",
  search: "🔍",
  magnifier: "🔎",

  // Misc
  rocket: "🚀",
  boom: "💥",
  zap: "⚡",
  bolt: "⚡",
  heart: "❤️",
  star: "⭐",
  sparkles: "✨",
  energy: "⚡",
  power: "💪",
  magic: "🪄",
  globe: "🌐",
  earth: "🌍",
  language: "🗣️",
  flag: "🚩",
};

/**
 * Color codes for formatting (using Unicode and emoji combinations)
 */
export const ColorCodes = {
  red: "🔴",
  blue: "🔵",
  green: "🟢",
  yellow: "🟡",
  orange: "🟠",
  purple: "🟣",
  gray: "⚫",
  pink: "💗",
  brown: "🟤",
};
