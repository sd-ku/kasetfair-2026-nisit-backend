-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('STUDENT', 'CLUB');

-- CreateEnum
CREATE TYPE "GoodsType" AS ENUM ('FOOD', 'NON_FOOD');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('DRAFT', 'STORE_DETAILS', 'PRODUCT_DETAILS', 'SUBMITTED');

-- CreateTable
CREATE TABLE "Student" (
    "student_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nisit_card_link" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "ClubInfo" (
    "id" SERIAL NOT NULL,
    "club_name" TEXT NOT NULL,
    "leader_student_id" TEXT,
    "application_link" TEXT,

    CONSTRAINT "ClubInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" SERIAL NOT NULL,
    "store_name" TEXT NOT NULL,
    "booth_number" TEXT,
    "type" "StoreType" NOT NULL,
    "club_info_id" INTEGER,
    "status" "StoreStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreLeader" (
    "store_id" INTEGER NOT NULL,
    "student_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "StoreLeader_pkey" PRIMARY KEY ("store_id","student_id")
);

-- CreateTable
CREATE TABLE "StoreMember" (
    "store_id" INTEGER NOT NULL,
    "student_id" TEXT NOT NULL,
    "position" TEXT,

    CONSTRAINT "StoreMember_pkey" PRIMARY KEY ("store_id","student_id")
);

-- CreateTable
CREATE TABLE "Goods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GoodsType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "store_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_phone_key" ON "Student"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Store_booth_number_key" ON "Store"("booth_number");

-- CreateIndex
CREATE INDEX "Store_type_idx" ON "Store"("type");

-- CreateIndex
CREATE INDEX "Store_status_idx" ON "Store"("status");

-- CreateIndex
CREATE INDEX "Goods_store_id_idx" ON "Goods"("store_id");

-- AddForeignKey
ALTER TABLE "ClubInfo" ADD CONSTRAINT "ClubInfo_leader_student_id_fkey" FOREIGN KEY ("leader_student_id") REFERENCES "Student"("student_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_club_info_id_fkey" FOREIGN KEY ("club_info_id") REFERENCES "ClubInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreLeader" ADD CONSTRAINT "StoreLeader_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreLeader" ADD CONSTRAINT "StoreLeader_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMember" ADD CONSTRAINT "StoreMember_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMember" ADD CONSTRAINT "StoreMember_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goods" ADD CONSTRAINT "Goods_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
