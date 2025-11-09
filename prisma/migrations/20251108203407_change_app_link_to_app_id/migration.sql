/*
  Warnings:

  - You are about to drop the column `applicationLink` on the `club_info` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[clubApplicationMediaId]` on the table `club_info` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "club_info" DROP COLUMN "applicationLink",
ADD COLUMN     "clubApplicationMediaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "club_info_clubApplicationMediaId_key" ON "club_info"("clubApplicationMediaId");

-- AddForeignKey
ALTER TABLE "club_info" ADD CONSTRAINT "club_info_clubApplicationMediaId_fkey" FOREIGN KEY ("clubApplicationMediaId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
