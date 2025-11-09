/*
  Warnings:

  - You are about to drop the column `clubInfoId` on the `store` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[storeId]` on the table `club_info` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `storeId` to the `club_info` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "store" DROP CONSTRAINT "store_clubInfoId_fkey";

-- DropIndex
DROP INDEX "store_clubInfoId_key";

-- AlterTable
ALTER TABLE "club_info" ADD COLUMN     "storeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "store" DROP COLUMN "clubInfoId";

-- CreateIndex
CREATE UNIQUE INDEX "club_info_storeId_key" ON "club_info"("storeId");

-- AddForeignKey
ALTER TABLE "club_info" ADD CONSTRAINT "club_info_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
