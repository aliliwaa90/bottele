import { Router } from "express";

import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import gameRoutes from "./game.routes.js";
import taskRoutes from "./task.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "VaultTap Backend",
    timestamp: new Date().toISOString()
  });
});

router.use("/auth", authRoutes);
router.use("/game", gameRoutes);
router.use("/tasks", taskRoutes);
router.use("/admin", adminRoutes);

export default router;
