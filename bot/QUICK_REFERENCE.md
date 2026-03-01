# 🎨 VaultTap Bot UI System - Quick Reference

A handy reference card for developers implementing the UI system.

## 📦 Import All Components

```typescript
import { UIBuilder } from "./lib/ui-builder.js";
import { KeyboardDesigner } from "./lib/keyboard-designer.js";
import { MessageFormatter } from "./lib/message-formatter.js";
import { ThemeManager, DarkTheme, LightTheme, EmojiPack } from "./lib/theme.js";
```

## 🎯 Most Common Tasks

### Display User Profile
```typescript
const profile = MessageFormatter.profileMessage({
  username: user.name,
  points: user.points,
  energy: user.energy,
  rank: user.rank
});
await ctx.reply(profile.text, profile.options);
```

### Show Leaderboard
```typescript
const leaderboard = MessageFormatter.leaderboardMessage(entries, page);
await ctx.editMessageText(leaderboard.text, leaderboard.options);
```

### Display Tasks
```typescript
const tasks = MessageFormatter.tasksMessage(taskList, canClaim);
await ctx.editMessageText(tasks.text, tasks.options);
```

### Show Referral Stats
```typescript
const referral = MessageFormatter.referralsMessage(stats);
await ctx.editMessageText(referral.text, referral.options);
```

### Display Stars Shop
```typescript
const shop = MessageFormatter.starsShopMessage(upgrades);
await ctx.editMessageText(shop.text, shop.options);
```

### Error Message
```typescript
const error = MessageFormatter.errorMessage("Title", "Description");
await ctx.reply(error.text, error.options);
```

### Success Message
```typescript
const success = MessageFormatter.successMessage("Success!", "Task completed");
await ctx.reply(success.text, success.options);
```

## ⌨️ Common Keyboards

### Main Menu
```typescript
KeyboardDesigner.mainMenu()
```

### Back Button Only
```typescript
KeyboardDesigner.backButton()
```

### Profile Actions
```typescript
KeyboardDesigner.profileActions()
```

### Task Actions
```typescript
KeyboardDesigner.taskActions(canClaim)
```

### Language Selection
```typescript
KeyboardDesigner.languageSelection()
```

### Yes/No Confirmation
```typescript
KeyboardDesigner.confirmation("yes_callback", "no_callback")
```

### Stars Shop
```typescript
KeyboardDesigner.starsShop([
  { id: "upgrade1", name: "Upgrade Name" }
])
```

## 🎨 Text Formatting

### Headers
```typescript
UIBuilder.header("Title", "🎮")
UIBuilder.divider()
```

### Stats Display
```typescript
UIBuilder.statRow("Label", "Value", "💎")
UIBuilder.statBlock("Title", [
  { label: "Stat1", value: 100, emoji: "💎" },
  { label: "Stat2", value: 200, emoji: "⭐" }
])
```

### Progress Bar
```typescript
UIBuilder.progressBar(current, max, width, emoji)
// Example: UIBuilder.progressBar(75, 100, 10, "⚡")
// Output: ▰▰▰▰▰▰▱▱▱▱ 75%
```

### Alerts
```typescript
UIBuilder.alert("success", "Message")
UIBuilder.alert("error", "Message")
UIBuilder.alert("warning", "Message")
UIBuilder.alert("info", "Message")
```

### Leaderboard Entry
```typescript
UIBuilder.leaderboardEntry(rank, username, score)
```

### Task Card
```typescript
UIBuilder.taskCard(name, reward, completed, emoji)
```

## 📋 Message Structure

All MessageFormatter methods return:
```typescript
{
  text: string,           // The formatted message text
  options: {
    reply_markup: ...,    // Inline keyboard
    parse_mode: "HTML"    // HTML formatting enabled
  }
}
```

Usage:
```typescript
const message = MessageFormatter.profileMessage(profile);
await ctx.reply(message.text, message.options);
```

## 🎯 Data Types

### UserProfile
```typescript
interface UserProfile {
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
}
```

### LeaderboardEntry
```typescript
interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}
```

### TaskEntry
```typescript
interface TaskEntry {
  name: string;
  reward: number;
  completed: boolean;
  emoji?: string;
}
```

### ReferralStats
```typescript
interface ReferralStats {
  code: string;
  level1Count: number;
  level2Count: number;
  level1Bonus: number;
  level2Bonus: number;
  estimatedReward: number;
}
```

### UpgradeItem
```typescript
interface UpgradeItem {
  id: string;
  name: string;
  current: number;
  next: number;
  cost: number;
  emoji?: string;
}
```

## 🎨 Emoji Reference

### Common Emojis Used
```typescript
EmojiPack.game        // 🎮
EmojiPack.trophy      // 🏆
EmojiPack.gem         // 💎
EmojiPack.check       // ✅
EmojiPack.cross       // ❌
EmojiPack.warn        // ⚠️
EmojiPack.star        // ⭐
EmojiPack.fire        // 🔥
EmojiPack.rocket      // 🚀
EmojiPack.money       // 💰
EmojiPack.user        // 👤
EmojiPack.users       // 👥
EmojiPack.chart       // 📊
```

## 🎨 Themes

### Set Theme
```typescript
ThemeManager.setTheme(DarkTheme);   // Default dark theme
ThemeManager.setTheme(LightTheme);  // Light theme
ThemeManager.setTheme(ModernTheme); // Modern theme
```

### Get Theme
```typescript
const currentTheme = ThemeManager.getTheme();
const emoji = ThemeManager.getEmoji("profile"); // Get specific emoji
```

## 🔄 Common Replacements

### Before & After Examples

**Profile:**
```typescript
// OLD
`📊 Profile\n• Points: ${data.points}\n• Energy: ${data.energy}`

// NEW
MessageFormatter.profileMessage({ username, points, energy }).text
```

**Leaderboard:**
```typescript
// OLD
`🏆 Top 10\n${top.map(p => `${p.rank}. ${p.name} - ${p.points}`).join("\n")}`

// NEW
MessageFormatter.leaderboardMessage(entries, 1).text
```

**Tasks:**
```typescript
// OLD
`Tasks:\n${tasks.map(t => `${t.name}: +${t.reward}`).join("\n")}`

// NEW
MessageFormatter.tasksMessage(taskList, canClaim).text
```

**Error:**
```typescript
// OLD
`❌ Error: ${error.message}`

// NEW
MessageFormatter.errorMessage("Error", error.message).text
```

## 💡 Pro Tips

1. **Always use `message.options`** when replying:
   ```typescript
   // ❌ WRONG
   await ctx.reply(message.text);
   
   // ✅ RIGHT
   await ctx.reply(message.text, message.options);
   ```

2. **Parse mode is already set**, don't override:
   ```typescript
   // ✅ Messages are already HTML-formatted
   const msg = MessageFormatter.profileMessage(data);
   await ctx.reply(msg.text, msg.options); // parse_mode: "HTML" included
   ```

3. **Check message structure**:
   ```typescript
   // All MessageFormatter methods return same structure
   {
     text: string,
     options: { reply_markup: InlineKeyboard, parse_mode: "HTML" }
   }
   ```

4. **For custom content**, use UIBuilder:
   ```typescript
   // Combine UIBuilder methods for custom layouts
   const custom = [
     UIBuilder.header("Title", "🎯"),
     UIBuilder.divider(),
     UIBuilder.statRow("Field", "Value", "💎")
   ].join("\n");
   
   await ctx.reply(custom, {
     reply_markup: KeyboardDesigner.backButton(),
     parse_mode: "HTML"
   });
   ```

5. **Edit vs Reply**:
   ```typescript
   // Use editMessageText for buttons (callbacks)
   await ctx.editMessageText(message.text, message.options);
   
   // Use reply for command handlers
   await ctx.reply(message.text, message.options);
   ```

## 🚫 Common Mistakes

```typescript
// ❌ DON'T: Mix old and new formatting
const message = MessageFormatter.profileMessage(data);
await ctx.reply("Old format: " + message.text); // DON'T DO THIS

// ✅ DO: Use message object completely
const message = MessageFormatter.profileMessage(data);
await ctx.reply(message.text, message.options);

// ❌ DON'T: Override parse_mode
await ctx.reply(message.text, {
  ...message.options,
  parse_mode: "Markdown" // DON'T OVERRIDE
});

// ✅ DO: Use provided options as-is
await ctx.reply(message.text, message.options);

// ❌ DON'T: Forget options when needed
await ctx.editMessageText(message.text); // Missing keyboard!

// ✅ DO: Include options for keyboard
await ctx.editMessageText(message.text, message.options);
```

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| Emojis not showing | Check UTF-8 encoding, use EmojiPack |
| HTML not formatting | Ensure `parse_mode: "HTML"` in options |
| Buttons not appearing | Pass message.options (includes reply_markup) |
| Long text cut off | Use \n for line breaks, not \\\n |
| Message too long | Split into multiple messages or edit text |
| Keyboard missing | Use message.options or KeyboardDesigner directly |

## 🔗 Files Location

- **UI Builder**: `bot/src/lib/ui-builder.ts`
- **Keyboard Designer**: `bot/src/lib/keyboard-designer.ts`
- **Message Formatter**: `bot/src/lib/message-formatter.ts`
- **Theme System**: `bot/src/lib/theme.ts`
- **Handler Examples**: `bot/src/lib/handlers.ts`
- **Integration Guide**: `bot/src/lib/integration-guide.ts`
- **This Reference**: `bot/QUICK_REFERENCE.md`
- **Implementation Checklist**: `bot/IMPLEMENTATION_CHECKLIST.md`

---

**Print this page or bookmark it for quick reference!** 📌
