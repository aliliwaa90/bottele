import { Router } from "express";
import ExcelJS from "exceljs";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma.js";
import { getSocket } from "../lib/socket.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { serializeTask, serializeUser } from "../utils/serializers.js";
import { validateBody, validateQuery } from "../utils/validate.js";

const router = Router();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  q: z.string().optional()
});

const messageSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(500),
  target: z.enum(["all", "active"]).default("all")
});

const upsertTaskSchema = z.object({
  key: z.string().min(3).max(64),
  titleAr: z.string().min(2).max(200),
  titleEn: z.string().min(2).max(200),
  type: z.enum(["DAILY", "SOCIAL", "CIPHER", "SPECIAL"]),
  reward: z.coerce.number().int().min(1).max(100000),
  link: z.string().url().optional(),
  isDaily: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

const snapshotSchema = z.object({
  batchTag: z.string().min(2).max(50)
});

const upsertEventSchema = z.object({
  key: z.string().min(3).max(64),
  nameAr: z.string().min(2).max(200),
  nameEn: z.string().min(2).max(200),
  multiplier: z.coerce.number().min(1).max(10),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean().default(true)
});

const toggleEventSchema = z.object({
  isActive: z.boolean()
});

router.use(requireAuth, requireAdmin);

router.get("/dashboard", async (_req, res) => {
  const [totalUsers, activeTodayEvents, totalPointsAgg, topUsers, snapshotsCount, activeEvents] =
    await Promise.all([
    prisma.user.count(),
    prisma.tapEvent.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      select: { userId: true }
    }),
    prisma.user.aggregate({ _sum: { points: true } }),
    prisma.user.findMany({
      take: 10,
      orderBy: { points: "desc" },
      select: {
        id: true,
        username: true,
        firstName: true,
        points: true,
        pph: true
      }
    }),
    prisma.airdropSnapshot.count(),
    prisma.specialEvent.count({
      where: {
        isActive: true,
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() }
      }
    })
  ]);
  const activeToday = new Set(activeTodayEvents.map((event) => event.userId)).size;

  res.json({
    totalUsers,
    activeToday,
    totalPoints: (totalPointsAgg._sum.points ?? BigInt(0)).toString(),
    snapshotsCount,
    activeEvents,
    topUsers: topUsers.map((user) => ({
      ...user,
      points: user.points.toString(),
      name: user.username || user.firstName || "VaultTaper"
    }))
  });
});

router.get("/users", validateQuery(paginationSchema), async (req, res) => {
  const { page, limit, q } = req.query as unknown as z.infer<typeof paginationSchema>;
  const skip = (page - 1) * limit;
  const filter = q
    ? {
        OR: [
          { username: { contains: q } },
          { firstName: { contains: q } },
          { referralCode: { contains: q } }
        ]
      }
    : undefined;

  const [total, users] = await Promise.all([
    prisma.user.count({ where: filter }),
    prisma.user.findMany({
      where: filter,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    })
  ]);

  res.json({
    page,
    limit,
    total,
    users: users.map((user) => serializeUser(user))
  });
});

router.post("/tasks/upsert", validateBody(upsertTaskSchema), async (req, res) => {
  const payload = req.body as z.infer<typeof upsertTaskSchema>;
  const taskCreateData: Prisma.TaskCreateInput = {
    key: payload.key,
    titleAr: payload.titleAr,
    titleEn: payload.titleEn,
    type: payload.type,
    reward: payload.reward,
    link: payload.link,
    isDaily: payload.isDaily,
    isActive: payload.isActive
  };
  const taskUpdateData: Prisma.TaskUpdateInput = {
    titleAr: payload.titleAr,
    titleEn: payload.titleEn,
    type: payload.type,
    reward: payload.reward,
    link: payload.link,
    isDaily: payload.isDaily,
    isActive: payload.isActive
  };
  const task = await prisma.task.upsert({
    where: { key: payload.key },
    update: taskUpdateData,
    create: taskCreateData
  });

  res.status(StatusCodes.OK).json({
    message: "Task saved.",
    task: serializeTask(task)
  });
});

router.get("/tasks", async (_req, res) => {
  const tasks = await prisma.task.findMany({
    orderBy: [{ type: "asc" }, { createdAt: "desc" }]
  });

  res.json(tasks.map((task) => serializeTask(task)));
});

router.get("/events", async (_req, res) => {
  const events = await prisma.specialEvent.findMany({
    orderBy: { startsAt: "desc" }
  });

  res.json(events);
});

router.post("/events/upsert", validateBody(upsertEventSchema), async (req, res) => {
  const payload = req.body as z.infer<typeof upsertEventSchema>;
  if (payload.endsAt <= payload.startsAt) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: "endsAt must be after startsAt." });
    return;
  }

  const eventCreateData: Prisma.SpecialEventCreateInput = {
    key: payload.key,
    nameAr: payload.nameAr,
    nameEn: payload.nameEn,
    multiplier: payload.multiplier,
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
    isActive: payload.isActive
  };
  const eventUpdateData: Prisma.SpecialEventUpdateInput = {
    nameAr: payload.nameAr,
    nameEn: payload.nameEn,
    multiplier: payload.multiplier,
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
    isActive: payload.isActive
  };
  const event = await prisma.specialEvent.upsert({
    where: { key: payload.key },
    update: eventUpdateData,
    create: eventCreateData
  });

  getSocket().emit("event:update", {
    id: event.id,
    nameAr: event.nameAr,
    nameEn: event.nameEn,
    multiplier: event.multiplier,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    isActive: event.isActive
  });

  res.status(StatusCodes.OK).json({
    message: "Event saved.",
    event
  });
});

router.post("/events/:eventId/toggle", validateBody(toggleEventSchema), async (req, res) => {
  const rawEventId = req.params.eventId;
  const eventId = Array.isArray(rawEventId) ? rawEventId[0] : rawEventId;
  if (!eventId) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid event id." });
    return;
  }
  const payload = req.body as z.infer<typeof toggleEventSchema>;
  const event = await prisma.specialEvent.update({
    where: { id: eventId },
    data: { isActive: payload.isActive }
  });
  res.status(StatusCodes.OK).json({
    message: payload.isActive ? "Event activated." : "Event deactivated.",
    event
  });
});

router.post("/notify", validateBody(messageSchema), async (req, res) => {
  const payload = req.body as z.infer<typeof messageSchema>;
  getSocket().emit("mass:notification", payload);
  res.status(StatusCodes.OK).json({
    message: "Notification dispatched through socket broadcast.",
    payload
  });
});

router.post("/airdrop/snapshot", validateBody(snapshotSchema), async (req, res) => {
  const { batchTag } = req.body as z.infer<typeof snapshotSchema>;
  const users = await prisma.user.findMany({
    where: { points: { gte: BigInt(10000) } },
    select: { id: true, points: true }
  });

  const snapshots = await prisma.$transaction(
    users.map((user) =>
      prisma.airdropSnapshot.create({
        data: {
          userId: user.id,
          points: user.points,
          tokenAmount: Number(user.points) / 1000,
          batchTag
        }
      })
    )
  );

  res.status(StatusCodes.OK).json({
    message: "Snapshot created.",
    batchTag,
    count: snapshots.length
  });
});

router.get("/export/users.xlsx", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" }
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Users");
  sheet.columns = [
    { header: "ID", key: "id", width: 30 },
    { header: "Telegram ID", key: "telegramId", width: 20 },
    { header: "Username", key: "username", width: 20 },
    { header: "Name", key: "name", width: 25 },
    { header: "Points", key: "points", width: 20 },
    { header: "PPH", key: "pph", width: 10 },
    { header: "Referral Code", key: "referralCode", width: 20 },
    { header: "Created At", key: "createdAt", width: 25 }
  ];

  for (const user of users) {
    sheet.addRow({
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      points: user.points.toString(),
      pph: user.pph,
      referralCode: user.referralCode,
      createdAt: user.createdAt.toISOString()
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader("Content-Disposition", "attachment; filename=vaulttap-users.xlsx");
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(Buffer.from(buffer));
});

export default router;
