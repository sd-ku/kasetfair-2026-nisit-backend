/*
  Warnings:

  - You are about to drop the `store_leader` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `store_member` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StoreRole" AS ENUM ('Leader', 'Staff');

-- DropForeignKey
ALTER TABLE "public"."goods" DROP CONSTRAINT "goods_storeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."store_leader" DROP CONSTRAINT "store_leader_nisitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."store_leader" DROP CONSTRAINT "store_leader_storeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."store_member" DROP CONSTRAINT "store_member_nisitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."store_member" DROP CONSTRAINT "store_member_storeId_fkey";

-- AlterTable
ALTER TABLE "nisit" ADD COLUMN     "storeId" INTEGER,
ADD COLUMN     "storeRole" "StoreRole",
ALTER COLUMN "email" SET DATA TYPE CITEXT;

-- DropTable
DROP TABLE "public"."store_leader";

-- DropTable
DROP TABLE "public"."store_member";

-- CreateIndex
CREATE INDEX "nisit_storeId_idx" ON "nisit"("storeId");

-- AddForeignKey
ALTER TABLE "nisit" ADD CONSTRAINT "nisit_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods" ADD CONSTRAINT "goods_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
