-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "baseAmount" INTEGER,
ADD COLUMN     "baseCurrency" TEXT,
ADD COLUMN     "fxRate" DOUBLE PRECISION,
ADD COLUMN     "taxAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxBreakdown" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "taxCountry" TEXT,
ADD COLUMN     "taxRatePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxRegion" TEXT;

-- AlterTable
ALTER TABLE "tenant_config" ADD COLUMN     "baseCurrency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "defaultCountry" TEXT NOT NULL DEFAULT 'IN',
ADD COLUMN     "defaultRegion" TEXT,
ADD COLUMN     "enabledCurrencies" TEXT[] DEFAULT ARRAY['INR']::TEXT[],
ADD COLUMN     "taxInclusive" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "fx_rates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "category" TEXT,
    "ratePct" DOUBLE PRECISION NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subjectName" TEXT,
    "subjectEmail" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "renderedHtml" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fx_rates_tenantId_idx" ON "fx_rates"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "fx_rates_tenantId_base_quote_key" ON "fx_rates"("tenantId", "base", "quote");

-- CreateIndex
CREATE INDEX "tax_rules_tenantId_country_region_idx" ON "tax_rules"("tenantId", "country", "region");

-- CreateIndex
CREATE INDEX "certificate_templates_tenantId_type_idx" ON "certificate_templates"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_templates_tenantId_type_name_key" ON "certificate_templates"("tenantId", "type", "name");

-- CreateIndex
CREATE INDEX "certificates_tenantId_type_idx" ON "certificates"("tenantId", "type");

-- CreateIndex
CREATE INDEX "certificates_tenantId_refType_refId_idx" ON "certificates"("tenantId", "refType", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");

-- AddForeignKey
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "certificate_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
