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

- Deploy `mini-app` and `admin` on Vercel as separate projects.
- `mini-app`:
  - Root Directory: `mini-app`
  - Build: `npm run build --workspace @vaulttap/mini-app`
- `admin`:
  - Root Directory: `admin`
  - Build: `npm run build --workspace @vaulttap/admin`

### Railway (Recommended for backend/bot)

- Deploy `backend` + `bot` on Railway.
- Set a MongoDB connection string in `DATABASE_URL`.

### MongoDB Atlas

- Create a cluster and copy the app connection string, then set it as `DATABASE_URL`.

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
