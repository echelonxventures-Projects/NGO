-- CreateEnum
CREATE TYPE "LiveSessionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LiveRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "live_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'jitsi',
    "roomName" TEXT NOT NULL,
    "joinUrl" TEXT NOT NULL,
    "hostId" TEXT,
    "hostName" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "recurrence" "LiveRecurrence" NOT NULL DEFAULT 'NONE',
    "status" "LiveSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "recordingUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_attendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "live_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_sessions_tenantId_idx" ON "live_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "live_sessions_tenantId_courseId_idx" ON "live_sessions"("tenantId", "courseId");

-- CreateIndex
CREATE INDEX "live_sessions_tenantId_scheduledAt_idx" ON "live_sessions"("tenantId", "scheduledAt");

-- CreateIndex
CREATE INDEX "live_attendance_tenantId_idx" ON "live_attendance"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "live_attendance_sessionId_userId_key" ON "live_attendance"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "live_attendance" ADD CONSTRAINT "live_attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
