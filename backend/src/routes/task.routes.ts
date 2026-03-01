import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { ensureCatalogSeeded } from "../services/catalog.js";
import { serializeTask } from "../utils/serializers.js";
import { validateBody } from "../utils/validate.js";

const router = Router();

const claimTaskSchema = z.object({
  cipher: z.string().optional()
});

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getTodayCipher(): string {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `VT-${day}${month}-CIPHER`;
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  await ensureCatalogSeeded();
  const userId = req.auth!.userId;
  const [tasks, claims] = await Promise.all([
    prisma.task.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { reward: "desc" }]
    }),
    prisma.userTask.findMany({
      where: { userId },
      select: {
        taskId: true,
        claimDate: true
      }
    })
  ]);

  const todayStart = startOfDay(new Date());
  const claimMap = new Map(claims.map((claim) => [claim.taskId, claim]));

  res.json({
    dailyCipherHint: "Daily cipher format: VT-DDMM-CIPHER",
    tasks: tasks.map((task) => {
      const claim = claimMap.get(task.id);
      const claimedToday = claim ? claim.claimDate >= todayStart : false;
      return {
        ...serializeTask(task),
        isClaimed: task.isDaily ? claimedToday : Boolean(claim),
        claimedAt: claim?.claimDate ?? null
      };
    })
  });
});

router.post("/:taskId/claim", validateBody(claimTaskSchema), async (req, res) => {
  const userId = req.auth!.userId;
  const taskIdRaw = req.params.taskId;
  const taskId = Array.isArray(taskIdRaw) ? taskIdRaw[0] : taskIdRaw;
  if (!taskId) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid task id." });
    return;
  }
  const payload = req.body as z.infer<typeof claimTaskSchema>;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || !task.isActive) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "Task not found." });
    return;
  }

  const todayStart = startOfDay(new Date());
  const previousClaim = await prisma.userTask.findFirst({
    where: task.isDaily
      ? {
          userId,
          taskId,
          claimDate: { gte: todayStart }
        }
      : {
          userId,
          taskId
        }
  });

  if (previousClaim) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: "Task already claimed." });
    return;
  }

  if (task.type === "CIPHER") {
    if (!payload.cipher || payload.cipher.trim().toUpperCase() !== getTodayCipher()) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid daily cipher." });
      return;
    }
  }

  const [claim] = await prisma.$transaction([
    prisma.userTask.create({
      data: {
        userId,
        taskId: task.id,
        rewardTaken: task.reward
      }
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: BigInt(task.reward) }
      }
    })
  ]);

  res.status(StatusCodes.OK).json({
    message: "Task claimed.",
    reward: task.reward,
    claim
  });
});

export default router;
