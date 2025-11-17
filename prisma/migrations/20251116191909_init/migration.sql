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
CREATE TABLE "consent_text" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_text_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consent" (
    "id" TEXT NOT NULL,
    "nisitId" TEXT NOT NULL,
    "consentTextId" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" TEXT,

    CONSTRAINT "user_consent_pkey" PRIMARY KEY ("id")
);

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
    "id" TEXT NOT NULL,
    "nisitId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "nisitCardMediaId" TEXT,
    "storeId" INTEGER,

    CONSTRAINT "nisit_pkey" PRIMARY KEY ("nisitId")
);

-- CreateTable
CREATE TABLE "store" (
    "id" SERIAL NOT NULL,
    "storeName" TEXT NOT NULL,
    "boothNumber" TEXT,
    "type" "StoreType" NOT NULL,
    "state" "StoreState" NOT NULL DEFAULT 'CreateStore',
    "boothMediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_info" (
    "id" TEXT NOT NULL,
    "clubName" TEXT,
    "clubApplicationMediaId" TEXT,
    "storeId" INTEGER NOT NULL,
    "leaderFirstName" TEXT,
    "leaderLastName" TEXT,
    "leaderEmail" TEXT,
    "leaderPhone" TEXT,
    "leaderNisitId" TEXT,

    CONSTRAINT "club_info_pkey" PRIMARY KEY ("id")
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
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GoodsType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "storeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "goodMediaId" TEXT,

    CONSTRAINT "goods_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "consent_text_language_active_key" ON "consent_text"("language", "active");

-- CreateIndex
CREATE INDEX "user_consent_nisitId_idx" ON "user_consent"("nisitId");

-- CreateIndex
CREATE INDEX "user_consent_consentTextId_idx" ON "user_consent"("consentTextId");

-- CreateIndex
CREATE INDEX "user_identity_providerEmail_idx" ON "user_identity"("providerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "user_identity_provider_providerSub_key" ON "user_identity"("provider", "providerSub");

-- CreateIndex
CREATE UNIQUE INDEX "nisit_phone_key" ON "nisit"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "nisit_email_key" ON "nisit"("email");

-- CreateIndex
CREATE UNIQUE INDEX "nisit_nisitCardMediaId_key" ON "nisit"("nisitCardMediaId");

-- CreateIndex
CREATE INDEX "nisit_storeId_idx" ON "nisit"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "store_boothNumber_key" ON "store"("boothNumber");

-- CreateIndex
CREATE UNIQUE INDEX "store_boothMediaId_key" ON "store"("boothMediaId");

-- CreateIndex
CREATE INDEX "store_type_idx" ON "store"("type");

-- CreateIndex
CREATE INDEX "store_state_idx" ON "store"("state");

-- CreateIndex
CREATE UNIQUE INDEX "club_info_clubApplicationMediaId_key" ON "club_info"("clubApplicationMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "club_info_storeId_key" ON "club_info"("storeId");

-- CreateIndex
CREATE INDEX "store_member_attempt_email_email_idx" ON "store_member_attempt_email"("email");

-- CreateIndex
CREATE UNIQUE INDEX "store_member_attempt_email_storeId_email_key" ON "store_member_attempt_email"("storeId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "goods_goodMediaId_key" ON "goods"("goodMediaId");

-- CreateIndex
CREATE INDEX "goods_storeId_idx" ON "goods"("storeId");

-- AddForeignKey
ALTER TABLE "user_consent" ADD CONSTRAINT "user_consent_consentTextId_fkey" FOREIGN KEY ("consentTextId") REFERENCES "consent_text"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_identity" ADD CONSTRAINT "user_identity_nisitId_fkey" FOREIGN KEY ("nisitId") REFERENCES "nisit"("nisitId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nisit" ADD CONSTRAINT "nisit_nisitCardMediaId_fkey" FOREIGN KEY ("nisitCardMediaId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nisit" ADD CONSTRAINT "nisit_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_boothMediaId_fkey" FOREIGN KEY ("boothMediaId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_info" ADD CONSTRAINT "club_info_clubApplicationMediaId_fkey" FOREIGN KEY ("clubApplicationMediaId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_info" ADD CONSTRAINT "club_info_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_member_attempt_email" ADD CONSTRAINT "store_member_attempt_email_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_member_attempt_email" ADD CONSTRAINT "store_member_attempt_email_nisitId_fkey" FOREIGN KEY ("nisitId") REFERENCES "nisit"("nisitId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods" ADD CONSTRAINT "goods_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods" ADD CONSTRAINT "goods_goodMediaId_fkey" FOREIGN KEY ("goodMediaId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
