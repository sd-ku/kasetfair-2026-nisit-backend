/*
  Warnings:

  - A unique constraint covering the columns `[storeAdminNisitId]` on the table `store` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `storeAdminNisitId` to the `store` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "store" ADD COLUMN     "storeAdminNisitId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "store_storeAdminNisitId_key" ON "store"("storeAdminNisitId");

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_storeAdminNisitId_fkey" FOREIGN KEY ("storeAdminNisitId") REFERENCES "nisit"("nisitId") ON DELETE CASCADE ON UPDATE CASCADE;
