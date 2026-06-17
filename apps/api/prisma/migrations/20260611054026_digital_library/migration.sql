-- CreateTable
CREATE TABLE "library_bookmarks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" JSONB NOT NULL DEFAULT '[]',
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "format" TEXT,
    "license" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_bookmarks_tenantId_idx" ON "library_bookmarks"("tenantId");

-- CreateIndex
CREATE INDEX "library_bookmarks_tenantId_userId_idx" ON "library_bookmarks"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "library_bookmarks_tenantId_userId_source_externalId_key" ON "library_bookmarks"("tenantId", "userId", "source", "externalId");
