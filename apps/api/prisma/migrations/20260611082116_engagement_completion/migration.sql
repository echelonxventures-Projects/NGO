-- AlterTable
ALTER TABLE "event_registrations" ADD COLUMN     "checkedInAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "volunteer_hour_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "signupId" TEXT NOT NULL,
    "hours" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_hour_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_benefits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "volunteer_hour_logs_tenantId_idx" ON "volunteer_hour_logs"("tenantId");

-- CreateIndex
CREATE INDEX "volunteer_hour_logs_tenantId_signupId_idx" ON "volunteer_hour_logs"("tenantId", "signupId");

-- CreateIndex
CREATE INDEX "membership_benefits_tenantId_idx" ON "membership_benefits"("tenantId");

-- CreateIndex
CREATE INDEX "membership_benefits_tenantId_planId_idx" ON "membership_benefits"("tenantId", "planId");
