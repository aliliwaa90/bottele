# VaultTap

Arabic:
- `VaultTap` مشروع كامل: بوت تيليجرام + Mini App Tap-to-Earn + Backend + Admin + عقود TON.
- العربية هي اللغة الافتراضية، مع دعم RTL وتعدد لغات كامل.
- تم إضافة حماية Telegram `initData` لمنع استخدام واجهة اللعب خارج تيليجرام.

English:
- `VaultTap` is a full stack Telegram game: Bot + Tap-to-Earn Mini App + Backend + Admin + TON contracts.
- Arabic is default language with full RTL support.
- Telegram `initData` verification is included to block unauthorized external usage.

## Project Structure

```txt
VaultTap/
  mini-app/
  backend/
  bot/
  admin/
  contracts/
```

## Key Features

- Tap-to-Earn engine: Tap, Combo, Energy, PPH, Boosters, Realtime.
- 25 upgrade cards with scaling levels and costs.
- Daily/Social/Cipher tasks.
- Multi-level referral system.
- Leaderboards (Global / Weekly / Friends).
- TON Connect + Claim Airdrop.
- Arabic-first Admin panel:
  - Dashboard analytics
  - Users management
  - Tasks management
  - Special events management
  - Mass broadcast
  - Airdrop snapshot + Excel export

## Requirements

- Node.js `22.x` recommended
- npm `>= 10`
- MongoDB `>= 6` (local, Atlas, or Railway Mongo)

## Environment Setup

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item mini-app/.env.example mini-app/.env
Copy-Item bot/.env.example bot/.env
Copy-Item admin/.env.example admin/.env.local
```

Important variables:
- `JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `BACKEND_URL`
- `ADMIN_TOKEN` (used by admin proxy)
- `TELEGRAM_LOGIN_REQUIRED=true` in production for secure mini-app login

## Install

```bash
npm install
```

## Prisma Setup

```bash
npm run prisma:generate --workspace @vaulttap/backend
npm run prisma:migrate:dev --workspace @vaulttap/backend
npm run prisma:seed --workspace @vaulttap/backend
```

## Local Run

```bash
npm run dev --workspace @vaulttap/backend
npm run dev --workspace @vaulttap/mini-app
npm run dev --workspace @vaulttap/bot
npm run dev --workspace @vaulttap/admin
```

Endpoints:
- Mini App: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Admin: `http://localhost:3000`

## Deployment

### Vercel

Deploy 4 separate Vercel projects from the same monorepo:

1. `backend` (Express API on Vercel Function)
2. `bot` (Telegram webhook on Vercel Function)
3. `mini-app` (Vite static + preview server)
4. `admin` (Next.js)

`backend`:
- Root Directory: `backend`
- Build Command: `npm ci --include=dev && npm run build`
- Output: default
- Required env:
  - `NODE_ENV=production`
  - `DATABASE_URL=<mongodb connection string>`
  - `JWT_SECRET=<very-strong-secret>`
  - `BACKEND_PORT=4000`
  - `SOCKET_ENABLED=false`
  - `TELEGRAM_LOGIN_REQUIRED=false`
  - `CORS_ORIGIN=<mini-app-url>,<admin-url>`
  - `SOCKET_CORS_ORIGIN=<mini-app-url>,<admin-url>`

`bot`:
- Root Directory: `bot`
- Build Command: `npm ci --include=dev && npm run build`
- Required env:
  - `TELEGRAM_BOT_TOKEN=<botfather token>`
  - `BACKEND_URL=<backend vercel url>`
  - `TELEGRAM_WEBAPP_URL=<mini-app vercel url>`
  - `BOT_RUN_MODE=webhook`
  - `TELEGRAM_WEBHOOK_URL=<bot vercel url>/api/webhook`
  - `TELEGRAM_WEBHOOK_SECRET=<random secret>`
  - `BOT_SETUP_KEY=<random secret>`
- After first deploy, register webhook:
  - `POST <bot vercel url>/api/setup?key=<BOT_SETUP_KEY>`

`mini-app`:
- Root Directory: `mini-app`
- Build Command: `npm ci --include=dev && npm run build`
- Start Command: `npm run start`
- Required env:
  - `VITE_API_URL=<backend vercel url>/api`
  - `VITE_SOCKET_URL=<backend vercel url>`
  - `VITE_DISABLE_SOCKET=true`
  - `VITE_TON_MANIFEST_URL=<mini-app vercel url>/tonconnect-manifest.json`

`admin`:
- Root Directory: `admin`
- Build Command: `npm ci --include=dev && npm run build`
- Start Command: `npm run start`
- Required env:
  - `BACKEND_URL=<backend vercel url>`
  - `ADMIN_TOKEN=<admin jwt token>`
  - `NEXT_PUBLIC_SOCKET_URL=<backend vercel url>`
  - `NEXT_PUBLIC_DISABLE_SOCKET=true`

### MongoDB Atlas

- Create cluster and whitelist Vercel/0.0.0.0 network access.
- Use Atlas connection string in backend `DATABASE_URL`.

## Security Note (Important)

“Hiding hosting URL completely” is not technically guaranteed for web apps.
What is implemented instead:
- Mini-app blocks non-Telegram access on UI level.
- Backend can enforce Telegram signed login (`TELEGRAM_LOGIN_REQUIRED=true`).
- Even if someone discovers the URL, backend rejects unauthorized sessions.

## Contracts

- Source: `contracts/contracts/VaultTapJetton.tact`
- Build:

```bash
npm run build --workspace @vaulttap/contracts
```
