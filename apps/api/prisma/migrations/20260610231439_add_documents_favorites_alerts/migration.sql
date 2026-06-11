-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('DOCUMENT_CHANGE', 'COLLECTION_START');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "openingDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectDocument" ADD COLUMN     "label" TEXT,
ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProjectFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFavorite_userId_projectId_key" ON "ProjectFavorite"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAlert_userId_projectId_type_key" ON "ProjectAlert"("userId", "projectId", "type");

-- AddForeignKey
ALTER TABLE "ProjectFavorite" ADD CONSTRAINT "ProjectFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFavorite" ADD CONSTRAINT "ProjectFavorite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAlert" ADD CONSTRAINT "ProjectAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAlert" ADD CONSTRAINT "ProjectAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
