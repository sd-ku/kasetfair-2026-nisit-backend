/*
  Warnings:

  - You are about to drop the `ClubInfo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Goods` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Store` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StoreLeader` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StoreMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Student` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "store_type" AS ENUM ('student', 'club');

-- CreateEnum
CREATE TYPE "goods_type" AS ENUM ('food', 'non_food');

-- CreateEnum
CREATE TYPE "store_status" AS ENUM ('draft', 'store_details', 'product_details', 'submitted');

-- DropForeignKey
ALTER TABLE "public"."ClubInfo" DROP CONSTRAINT "ClubInfo_leader_student_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Goods" DROP CONSTRAINT "Goods_store_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Store" DROP CONSTRAINT "Store_club_info_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."StoreLeader" DROP CONSTRAINT "StoreLeader_store_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."StoreLeader" DROP CONSTRAINT "StoreLeader_student_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."StoreMember" DROP CONSTRAINT "StoreMember_store_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."StoreMember" DROP CONSTRAINT "StoreMember_student_id_fkey";

-- DropTable
DROP TABLE "public"."ClubInfo";

-- DropTable
DROP TABLE "public"."Goods";

-- DropTable
DROP TABLE "public"."Store";

-- DropTable
DROP TABLE "public"."StoreLeader";

-- DropTable
DROP TABLE "public"."StoreMember";

-- DropTable
DROP TABLE "public"."Student";

-- DropEnum
DROP TYPE "public"."GoodsType";

-- DropEnum
DROP TYPE "public"."StoreStatus";

-- DropEnum
DROP TYPE "public"."StoreType";

-- CreateTable
CREATE TABLE "student" (
    "student_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nisit_card_link" TEXT,

    CONSTRAINT "student_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "club_info" (
    "id" SERIAL NOT NULL,
    "club_name" TEXT NOT NULL,
    "leader_student_id" TEXT,
    "application_link" TEXT,

    CONSTRAINT "club_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store" (
    "id" SERIAL NOT NULL,
    "store_name" TEXT NOT NULL,
    "booth_number" TEXT,
    "type" "store_type" NOT NULL,
    "club_info_id" INTEGER,
    "status" "store_status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_leader" (
    "store_id" INTEGER NOT NULL,
    "student_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "store_leader_pkey" PRIMARY KEY ("store_id","student_id")
);

-- CreateTable
CREATE TABLE "store_member" (
    "store_id" INTEGER NOT NULL,
    "student_id" TEXT NOT NULL,
    "position" TEXT,

    CONSTRAINT "store_member_pkey" PRIMARY KEY ("store_id","student_id")
);

-- CreateTable
CREATE TABLE "goods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "goods_type" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "store_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_email_key" ON "student"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_phone_key" ON "student"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "store_booth_number_key" ON "store"("booth_number");

-- CreateIndex
CREATE INDEX "store_type_idx" ON "store"("type");

-- CreateIndex
CREATE INDEX "store_status_idx" ON "store"("status");

-- CreateIndex
CREATE INDEX "goods_store_id_idx" ON "goods"("store_id");

-- AddForeignKey
ALTER TABLE "club_info" ADD CONSTRAINT "club_info_leader_student_id_fkey" FOREIGN KEY ("leader_student_id") REFERENCES "student"("student_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_club_info_id_fkey" FOREIGN KEY ("club_info_id") REFERENCES "club_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_leader" ADD CONSTRAINT "store_leader_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_leader" ADD CONSTRAINT "store_leader_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_member" ADD CONSTRAINT "store_member_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_member" ADD CONSTRAINT "store_member_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods" ADD CONSTRAINT "goods_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
