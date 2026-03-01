import { prisma } from "../lib/prisma.js";
import { DEFAULT_TASKS, DEFAULT_UPGRADES } from "../data/default-catalog.js";

let ensurePromise: Promise<void> | null = null;

async function seedDefaults() {
  const [upgradeCount, taskCount] = await Promise.all([prisma.upgrade.count(), prisma.task.count()]);
  if (upgradeCount > 0 && taskCount > 0) {
    return;
  }

  if (upgradeCount === 0) {
    await prisma.$transaction(
      DEFAULT_UPGRADES.map((upgrade) =>
        prisma.upgrade.upsert({
          where: { key: upgrade.key },
          update: upgrade,
          create: upgrade
        })
      )
    );
  }

  if (taskCount === 0) {
    await prisma.$transaction(
      DEFAULT_TASKS.map((task) =>
        prisma.task.upsert({
          where: { key: task.key },
          update: task,
          create: task
        })
      )
    );
  }
}

export async function ensureCatalogSeeded() {
  if (!ensurePromise) {
    ensurePromise = seedDefaults()
      .catch((error) => {
        console.error("Failed to ensure catalog data:", error);
      })
      .finally(() => {
        ensurePromise = null;
      });
  }
  await ensurePromise;
}

