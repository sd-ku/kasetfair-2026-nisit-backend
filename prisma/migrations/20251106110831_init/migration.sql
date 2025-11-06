-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('Nisit', 'Club');

-- CreateEnum
CREATE TYPE "GoodsType" AS ENUM ('Food', 'NonFood');

-- CreateEnum
CREATE TYPE "StoreState" AS ENUM ('CreateStore', 'ClubInfo', 'StoreDetails', 'ProductDetails', 'Submitted', 'Pending', 'Success', 'Rejected');

-- CreateEnum
CREATE TYPE "StoreRole" AS ENUM ('Leader', 'Staff');

-- CreateEnum
CREATE TYPE "StoreMemberStatus" AS ENUM ('NotFound', 'Invited', 'Joined', 'Declined');

-- CreateTable
CREATE TABLE "user_identity" (
    "providerSub" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEmail" CITEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "nisitId" TEXT
);

-- CreateTable
CREATE TABLE "nisit" (
    "nisitId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "nisitCardLink" TEXT,
    "storeId" INTEGER,

    CONSTRAINT "nisit_pkey" PRIMARY KEY ("nisitId")
);

-- CreateTable
CREATE TABLE "club_info" (
    "id" SERIAL NOT NULL,
    "clubName" TEXT NOT NULL,
    "leaderNisitId" TEXT,
    "applicationLink" TEXT,

    CONSTRAINT "club_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store" (
    "id" SERIAL NOT NULL,
    "storeName" TEXT NOT NULL,
    "boothNumber" TEXT,
    "type" "StoreType" NOT NULL,
    "clubInfoId" INTEGER,
    "state" "StoreState" NOT NULL DEFAULT 'CreateStore',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_member_attempt_email" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "email" CITEXT NOT NULL,
    "nisitId" TEXT,
    "status" "StoreMemberStatus" NOT NULL DEFAULT 'Invited',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "store_member_attempt_email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GoodsType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "storeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_identity_providerEmail_idx" ON "user_identity"("providerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "user_identity_provider_providerSub_key" ON "user_identity"("provider", "providerSub");

-- CreateIndex
CREATE UNIQUE INDEX "nisit_phone_key" ON "nisit"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "nisit_email_key" ON "nisit"("email");

-- CreateIndex
CREATE INDEX "nisit_storeId_idx" ON "nisit"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "store_boothNumber_key" ON "store"("boothNumber");

-- CreateIndex
CREATE UNIQUE INDEX "store_clubInfoId_key" ON "store"("clubInfoId");

-- CreateIndex
CREATE INDEX "store_type_idx" ON "store"("type");

-- CreateIndex
CREATE INDEX "store_state_idx" ON "store"("state");

-- CreateIndex
CREATE INDEX "store_member_attempt_email_email_idx" ON "store_member_attempt_email"("email");

-- CreateIndex
CREATE UNIQUE INDEX "store_member_attempt_email_storeId_email_key" ON "store_member_attempt_email"("storeId", "email");

-- CreateIndex
CREATE INDEX "goods_storeId_idx" ON "goods"("storeId");

-- AddForeignKey
ALTER TABLE "user_identity" ADD CONSTRAINT "user_identity_nisitId_fkey" FOREIGN KEY ("nisitId") REFERENCES "nisit"("nisitId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nisit" ADD CONSTRAINT "nisit_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_info" ADD CONSTRAINT "club_info_leaderNisitId_fkey" FOREIGN KEY ("leaderNisitId") REFERENCES "nisit"("nisitId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_clubInfoId_fkey" FOREIGN KEY ("clubInfoId") REFERENCES "club_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_member_attempt_email" ADD CONSTRAINT "store_member_attempt_email_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_member_attempt_email" ADD CONSTRAINT "store_member_attempt_email_nisitId_fkey" FOREIGN KEY ("nisitId") REFERENCES "nisit"("nisitId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods" ADD CONSTRAINT "goods_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
