/*
  Warnings:

  - You are about to drop the column `nisitCardLink` on the `nisit` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[goodMediaId]` on the table `goods` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nisitCardMediaId]` on the table `nisit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[boothMediaId]` on the table `store` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "goods" ADD COLUMN     "goodMediaId" TEXT;

-- AlterTable
ALTER TABLE "nisit" DROP COLUMN "nisitCardLink",
ADD COLUMN     "nisitCardMediaId" TEXT;

-- AlterTable
ALTER TABLE "store" ADD COLUMN     "boothMediaId" TEXT;

-- CreateTable
CREATE TABLE "medias" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "goods_goodMediaId_key" ON "goods"("goodMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "nisit_nisitCardMediaId_key" ON "nisit"("nisitCardMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "store_boothMediaId_key" ON "store"("boothMediaId");

-- AddForeignKey
ALTER TABLE "nisit" ADD CONSTRAINT "nisit_nisitCardMediaId_fkey" FOREIGN KEY ("nisitCardMediaId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_boothMediaId_fkey" FOREIGN KEY ("boothMediaId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods" ADD CONSTRAINT "goods_goodMediaId_fkey" FOREIGN KEY ("goodMediaId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
