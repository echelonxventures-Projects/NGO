-- CreateTable
CREATE TABLE "smart_links" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "androidUrl" TEXT,
    "iosUrl" TEXT,
    "fallbackUrl" TEXT,
    "title" TEXT,
    "campaign" TEXT,
    "referrerId" TEXT,
    "qrPayload" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_link_clicks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "platform" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "context" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smart_link_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "smart_links_tenantId_idx" ON "smart_links"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "smart_links_tenantId_slug_key" ON "smart_links"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "smart_link_clicks_tenantId_idx" ON "smart_link_clicks"("tenantId");

-- CreateIndex
CREATE INDEX "smart_link_clicks_tenantId_linkId_idx" ON "smart_link_clicks"("tenantId", "linkId");
