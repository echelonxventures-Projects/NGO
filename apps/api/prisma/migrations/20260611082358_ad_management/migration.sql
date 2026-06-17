-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('BANNER', 'VIDEO', 'NATIVE', 'SPONSORED', 'AFFILIATE', 'CAMPAIGN');

-- CreateTable
CREATE TABLE "ad_placements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "placementId" TEXT,
    "name" TEXT NOT NULL,
    "type" "AdType" NOT NULL DEFAULT 'BANNER',
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "html" TEXT,
    "targetUrl" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "targeting" JSONB NOT NULL DEFAULT '{}',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_impressions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_clicks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_placements_tenantId_idx" ON "ad_placements"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_placements_tenantId_key_key" ON "ad_placements"("tenantId", "key");

-- CreateIndex
CREATE INDEX "ads_tenantId_idx" ON "ads"("tenantId");

-- CreateIndex
CREATE INDEX "ads_tenantId_active_idx" ON "ads"("tenantId", "active");

-- CreateIndex
CREATE INDEX "ad_impressions_tenantId_idx" ON "ad_impressions"("tenantId");

-- CreateIndex
CREATE INDEX "ad_impressions_tenantId_adId_idx" ON "ad_impressions"("tenantId", "adId");

-- CreateIndex
CREATE INDEX "ad_clicks_tenantId_idx" ON "ad_clicks"("tenantId");

-- CreateIndex
CREATE INDEX "ad_clicks_tenantId_adId_idx" ON "ad_clicks"("tenantId", "adId");

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "ad_placements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
