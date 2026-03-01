import { PrismaClient } from "@prisma/client";

import { DEFAULT_TASKS, DEFAULT_UPGRADES } from "../src/data/default-catalog.js";

const prisma = new PrismaClient();

async function main() {
  for (const upgrade of DEFAULT_UPGRADES) {
    await prisma.upgrade.upsert({
      where: { key: upgrade.key },
      update: upgrade,
      create: upgrade
    });
  }

  for (const task of DEFAULT_TASKS) {
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

