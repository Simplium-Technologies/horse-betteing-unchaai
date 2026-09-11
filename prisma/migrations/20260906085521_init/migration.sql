-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "RaceStatus" AS ENUM ('UPCOMING', 'OPEN', 'CLOSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PointRuleType" AS ENUM ('CORRECT_POSITION', 'TOP_N');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PARTICIPANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Horse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Horse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "raceDate" TIMESTAMP(3) NOT NULL,
    "predictionCloseTime" TIMESTAMP(3) NOT NULL,
    "status" "RaceStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceHorse" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "horseId" TEXT NOT NULL,

    CONSTRAINT "RaceHorse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionSelection" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "horseId" TEXT NOT NULL,
    "predictedPosition" INTEGER NOT NULL,

    CONSTRAINT "PredictionSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "horseId" TEXT NOT NULL,
    "actualPosition" INTEGER NOT NULL,

    CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PointRuleType" NOT NULL,
    "position" INTEGER,
    "topN" INTEGER,
    "points" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Horse_name_key" ON "Horse"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RaceHorse_raceId_horseId_key" ON "RaceHorse"("raceId", "horseId");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_userId_raceId_key" ON "Prediction"("userId", "raceId");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionSelection_predictionId_horseId_key" ON "PredictionSelection"("predictionId", "horseId");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionSelection_predictionId_predictedPosition_key" ON "PredictionSelection"("predictionId", "predictedPosition");

-- CreateIndex
CREATE UNIQUE INDEX "RaceResult_raceId_horseId_key" ON "RaceResult"("raceId", "horseId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceResult_raceId_actualPosition_key" ON "RaceResult"("raceId", "actualPosition");

-- AddForeignKey
ALTER TABLE "RaceHorse" ADD CONSTRAINT "RaceHorse_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceHorse" ADD CONSTRAINT "RaceHorse_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionSelection" ADD CONSTRAINT "PredictionSelection_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionSelection" ADD CONSTRAINT "PredictionSelection_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
