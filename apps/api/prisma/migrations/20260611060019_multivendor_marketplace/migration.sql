-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('NGO', 'SHG', 'ARTISAN', 'WOMEN_ENTREPRENEUR', 'TRAINER', 'OTHER');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "vendorId" TEXT;

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VendorType" NOT NULL DEFAULT 'OTHER',
    "status" "VendorStatus" NOT NULL DEFAULT 'PENDING',
    "commissionPct" INTEGER NOT NULL DEFAULT 1500,
    "bio" TEXT,
    "logoUrl" TEXT,
    "payoutDetails" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_payouts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "grossSales" INTEGER NOT NULL DEFAULT 0,
    "commission" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "vendor_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendors_tenantId_idx" ON "vendors"("tenantId");

-- CreateIndex
CREATE INDEX "vendors_tenantId_userId_idx" ON "vendors"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_tenantId_slug_key" ON "vendors"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "vendor_payouts_tenantId_idx" ON "vendor_payouts"("tenantId");

-- CreateIndex
CREATE INDEX "vendor_payouts_tenantId_vendorId_idx" ON "vendor_payouts"("tenantId", "vendorId");
