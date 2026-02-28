import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimitFactory from "express-rate-limit";
import helmetFactory from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import routes from "./routes/index.js";

export const app = express();
const helmet = helmetFactory as unknown as () => ReturnType<typeof express.json>;
const rateLimit = rateLimitFactory as unknown as (options: {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}) => ReturnType<typeof express.json>;

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(","),
    credentials: true
  })
);
app.use(compression());
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);
