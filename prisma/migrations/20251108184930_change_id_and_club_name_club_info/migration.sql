/*
  Warnings:

  - The primary key for the `club_info` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "store" DROP CONSTRAINT "store_clubInfoId_fkey";

-- AlterTable
ALTER TABLE "club_info" DROP CONSTRAINT "club_info_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "clubName" DROP NOT NULL,
ADD CONSTRAINT "club_info_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "club_info_id_seq";

-- AlterTable
ALTER TABLE "store" ALTER COLUMN "clubInfoId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_clubInfoId_fkey" FOREIGN KEY ("clubInfoId") REFERENCES "club_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;
