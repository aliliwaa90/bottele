import { PrismaClient, TaskType } from "@prisma/client";

const prisma = new PrismaClient();

const upgrades = [
  { key: "iron_finger", titleAr: "إصبع حديدي", titleEn: "Iron Finger", descriptionAr: "زيادة قوة النقرة.", descriptionEn: "Increase tap power.", baseCost: 100, tapBoost: 1, pphBoost: 0, energyBoost: 0 },
  { key: "turbo_glove", titleAr: "قفاز توربو", titleEn: "Turbo Glove", descriptionAr: "نقرات أسرع مع تأثير مضاعف.", descriptionEn: "Faster taps with extra impact.", baseCost: 180, tapBoost: 1, pphBoost: 2, energyBoost: 0 },
  { key: "energy_drink", titleAr: "مشروب طاقة", titleEn: "Energy Drink", descriptionAr: "زيادة الحد الأقصى للطاقة.", descriptionEn: "Increase max energy pool.", baseCost: 260, tapBoost: 0, pphBoost: 0, energyBoost: 80 },
  { key: "smart_battery", titleAr: "بطارية ذكية", titleEn: "Smart Battery", descriptionAr: "رفع سعة الطاقة.", descriptionEn: "Boost energy capacity.", baseCost: 340, tapBoost: 0, pphBoost: 0, energyBoost: 120 },
  { key: "mining_drone", titleAr: "درون تعدين", titleEn: "Mining Drone", descriptionAr: "دخل سلبي كل ساعة.", descriptionEn: "Passive hourly earnings.", baseCost: 450, tapBoost: 0, pphBoost: 8, energyBoost: 0 },
  { key: "neon_pickaxe", titleAr: "فأس نيون", titleEn: "Neon Pickaxe", descriptionAr: "تعزيز أرباح النقرة.", descriptionEn: "Enhance point gain per tap.", baseCost: 560, tapBoost: 2, pphBoost: 4, energyBoost: 0 },
  { key: "quantum_chip", titleAr: "رقاقة كوانتم", titleEn: "Quantum Chip", descriptionAr: "تحسين الذكاء التشغيلي.", descriptionEn: "Improve operational logic.", baseCost: 700, tapBoost: 0, pphBoost: 14, energyBoost: 0 },
  { key: "auto_clicker", titleAr: "نقر تلقائي", titleEn: "Auto Clicker", descriptionAr: "رفع الدخل دون تفاعل.", descriptionEn: "Earn more while idle.", baseCost: 900, tapBoost: 1, pphBoost: 20, energyBoost: 0 },
  { key: "cooling_core", titleAr: "نواة تبريد", titleEn: "Cooling Core", descriptionAr: "استعادة الطاقة بكفاءة.", descriptionEn: "More efficient energy recovery.", baseCost: 1100, tapBoost: 0, pphBoost: 6, energyBoost: 150 },
  { key: "market_signal", titleAr: "إشارة السوق", titleEn: "Market Signal", descriptionAr: "زيادة Profit Per Hour.", descriptionEn: "Increase Profit Per Hour.", baseCost: 1350, tapBoost: 0, pphBoost: 28, energyBoost: 0 },
  { key: "hyper_node", titleAr: "عقدة فائقة", titleEn: "Hyper Node", descriptionAr: "عائد أعلى على كل دورة.", descriptionEn: "Higher return per cycle.", baseCost: 1650, tapBoost: 1, pphBoost: 34, energyBoost: 0 },
  { key: "command_center", titleAr: "مركز قيادة", titleEn: "Command Center", descriptionAr: "تحكم أوسع في النظام.", descriptionEn: "Wider system control.", baseCost: 2000, tapBoost: 2, pphBoost: 24, energyBoost: 120 },
  { key: "vault_optimizer", titleAr: "محسن الخزنة", titleEn: "Vault Optimizer", descriptionAr: "استغلال أفضل للموارد.", descriptionEn: "Better resource utilization.", baseCost: 2400, tapBoost: 1, pphBoost: 46, energyBoost: 0 },
  { key: "moon_relay", titleAr: "مرحل قمري", titleEn: "Moon Relay", descriptionAr: "شبكة أرباح ممتدة.", descriptionEn: "Extended profit network.", baseCost: 2900, tapBoost: 0, pphBoost: 58, energyBoost: 0 },
  { key: "satellite_grid", titleAr: "شبكة أقمار", titleEn: "Satellite Grid", descriptionAr: "تغطية أوسع ودخل أكبر.", descriptionEn: "Wider coverage and better income.", baseCost: 3500, tapBoost: 0, pphBoost: 68, energyBoost: 40 },
  { key: "fusion_cell", titleAr: "خلية اندماج", titleEn: "Fusion Cell", descriptionAr: "طاقة أكبر للنقر المستمر.", descriptionEn: "More power for prolonged tapping.", baseCost: 4200, tapBoost: 1, pphBoost: 22, energyBoost: 260 },
  { key: "alpha_protocol", titleAr: "بروتوكول ألفا", titleEn: "Alpha Protocol", descriptionAr: "رفع كفاءة الجمع.", descriptionEn: "Improve harvesting efficiency.", baseCost: 5000, tapBoost: 2, pphBoost: 72, energyBoost: 0 },
  { key: "beta_protocol", titleAr: "بروتوكول بيتا", titleEn: "Beta Protocol", descriptionAr: "تحسين اقتصادي متقدم.", descriptionEn: "Advanced economy boost.", baseCost: 5900, tapBoost: 1, pphBoost: 84, energyBoost: 0 },
  { key: "gamma_protocol", titleAr: "بروتوكول جاما", titleEn: "Gamma Protocol", descriptionAr: "استقرار ودخل أعلى.", descriptionEn: "Stability and higher income.", baseCost: 6900, tapBoost: 2, pphBoost: 96, energyBoost: 0 },
  { key: "omega_protocol", titleAr: "بروتوكول أوميغا", titleEn: "Omega Protocol", descriptionAr: "تعزيز شامل للأرباح.", descriptionEn: "Full-spectrum earning boost.", baseCost: 8000, tapBoost: 3, pphBoost: 112, energyBoost: 80 },
  { key: "referral_booster", titleAr: "معزز الدعوات", titleEn: "Referral Booster", descriptionAr: "مكافآت دعوة أعلى.", descriptionEn: "Increase referral rewards.", baseCost: 9200, tapBoost: 1, pphBoost: 48, energyBoost: 0 },
  { key: "elite_miner", titleAr: "منقب النخبة", titleEn: "Elite Miner", descriptionAr: "دفع الأرباح لنطاق أعلى.", descriptionEn: "Push earnings to the next tier.", baseCost: 10500, tapBoost: 2, pphBoost: 128, energyBoost: 0 },
  { key: "network_overclock", titleAr: "كسر سرعة الشبكة", titleEn: "Network Overclock", descriptionAr: "تسريع كامل للمنظومة.", descriptionEn: "Overclock the whole network.", baseCost: 12000, tapBoost: 2, pphBoost: 142, energyBoost: 120 },
  { key: "legendary_core", titleAr: "النواة الأسطورية", titleEn: "Legendary Core", descriptionAr: "تعزيز نادر وعالي.", descriptionEn: "Rare and high-impact boost.", baseCost: 14000, tapBoost: 3, pphBoost: 165, energyBoost: 150 },
  { key: "vaulttap_infinity", titleAr: "VaultTap Infinity", titleEn: "VaultTap Infinity", descriptionAr: "أقوى ترقية في النظام.", descriptionEn: "The strongest upgrade in the system.", baseCost: 16500, tapBoost: 4, pphBoost: 190, energyBoost: 200 }
] as const;

const tasks = [
  { key: "daily_check_in", titleAr: "تسجيل دخول يومي", titleEn: "Daily Check-in", type: TaskType.DAILY, reward: 500, isDaily: true },
  { key: "daily_combo_master", titleAr: "اصنع كومبو 25", titleEn: "Make 25 Combo", type: TaskType.DAILY, reward: 800, isDaily: true },
  { key: "join_telegram_channel", titleAr: "انضم لقناة تيليجرام", titleEn: "Join Telegram Channel", type: TaskType.SOCIAL, reward: 1200, link: "https://t.me", isDaily: false },
  { key: "follow_x", titleAr: "تابعنا على X", titleEn: "Follow us on X", type: TaskType.SOCIAL, reward: 1200, link: "https://x.com", isDaily: false },
  { key: "invite_3_friends", titleAr: "ادعُ 3 أصدقاء", titleEn: "Invite 3 Friends", type: TaskType.SPECIAL, reward: 2000, isDaily: false },
  { key: "daily_cipher", titleAr: "حل الشفرة اليومية", titleEn: "Solve Daily Cipher", type: TaskType.CIPHER, reward: 1500, isDaily: true }
] as const;

async function main() {
  for (const upgrade of upgrades) {
    await prisma.upgrade.upsert({
      where: { key: upgrade.key },
      update: upgrade,
      create: upgrade
    });
  }

  for (const task of tasks) {
    await prisma.task.upsert({
      where: { key: task.key },
      update: task,
      create: task
    });
  }

  const adminTelegramId = BigInt("999999999");
  const adminReferralCode = "ADMIN9999";
  await prisma.user.upsert({
    where: { telegramId: adminTelegramId },
    update: { role: "ADMIN", language: "ar", referralCode: adminReferralCode },
    create: {
      telegramId: adminTelegramId,
      username: "vaulttap_admin",
      firstName: "VaultTap",
      lastName: "Admin",
      language: "ar",
      role: "ADMIN",
      referralCode: adminReferralCode
    }
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
