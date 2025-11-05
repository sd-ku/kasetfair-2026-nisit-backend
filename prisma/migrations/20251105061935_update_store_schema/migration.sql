/*
  Warnings:

  - You are about to drop the column `storeRole` on the `nisit` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `store` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[clubInfoId]` on the table `store` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StoreState" AS ENUM ('CreateStore', 'StoreDetails', 'ProductDetails', 'Submitted', 'Pending', 'Success', 'Rejected');

-- DropIndex
DROP INDEX "public"."store_status_idx";

-- AlterTable
ALTER TABLE "nisit" DROP COLUMN "storeRole";

-- AlterTable
ALTER TABLE "store" DROP COLUMN "status",
ADD COLUMN     "state" "StoreState" NOT NULL DEFAULT 'CreateStore';

-- DropEnum
DROP TYPE "public"."StoreStatus";

-- CreateIndex
CREATE UNIQUE INDEX "store_clubInfoId_key" ON "store"("clubInfoId");

-- CreateIndex
CREATE INDEX "store_state_idx" ON "store"("state");
