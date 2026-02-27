-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('DAILY', 'SOCIAL', 'CIPHER', 'SPECIAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "language" TEXT NOT NULL DEFAULT 'ar',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "points" BIGINT NOT NULL DEFAULT 0,
    "energy" INTEGER NOT NULL DEFAULT 1000,
    "maxEnergy" INTEGER NOT NULL DEFAULT 1000,
    "tapPower" INTEGER NOT NULL DEFAULT 1,
    "comboCount" INTEGER NOT NULL DEFAULT 0,
    "comboMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "pph" INTEGER NOT NULL DEFAULT 0,
    "totalTaps" BIGINT NOT NULL DEFAULT 0,
    "walletAddress" TEXT,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "lastTapAt" TIMESTAMP(3),
    "lastEnergyRefill" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastProfitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upgrade" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "baseCost" INTEGER NOT NULL,
    "maxLevel" INTEGER NOT NULL DEFAULT 20,
    "pphBoost" INTEGER NOT NULL DEFAULT 0,
    "tapBoost" INTEGER NOT NULL DEFAULT 0,
    "energyBoost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Upgrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUpgrade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "upgradeId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserUpgrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "reward" INTEGER NOT NULL,
    "link" TEXT,
    "isDaily" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "claimDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rewardTaken" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TapEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taps" INTEGER NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "comboMultiplier" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialEvent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirdropSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" BIGINT NOT NULL,
    "tokenAmount" DECIMAL(20,4) NOT NULL,
    "batchTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AirdropSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_points_idx" ON "User"("points" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Upgrade_key_key" ON "Upgrade"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserUpgrade_userId_upgradeId_key" ON "UserUpgrade"("userId", "upgradeId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_key_key" ON "Task"("key");

-- CreateIndex
CREATE INDEX "UserTask_userId_claimDate_idx" ON "UserTask"("userId", "claimDate");

-- CreateIndex
CREATE INDEX "TapEvent_userId_createdAt_idx" ON "TapEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialEvent_key_key" ON "SpecialEvent"("key");

-- CreateIndex
CREATE INDEX "AirdropSnapshot_batchTag_idx" ON "AirdropSnapshot"("batchTag");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUpgrade" ADD CONSTRAINT "UserUpgrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUpgrade" ADD CONSTRAINT "UserUpgrade_upgradeId_fkey" FOREIGN KEY ("upgradeId") REFERENCES "Upgrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTask" ADD CONSTRAINT "UserTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTask" ADD CONSTRAINT "UserTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TapEvent" ADD CONSTRAINT "TapEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirdropSnapshot" ADD CONSTRAINT "AirdropSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
