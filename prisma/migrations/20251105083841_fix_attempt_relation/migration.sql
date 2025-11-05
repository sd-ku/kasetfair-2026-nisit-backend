-- CreateEnum
CREATE TYPE "StoreMemberStatus" AS ENUM ('NotFound', 'Invited', 'Joined', 'Declined');

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

-- CreateIndex
CREATE INDEX "store_member_attempt_email_email_idx" ON "store_member_attempt_email"("email");

-- CreateIndex
CREATE UNIQUE INDEX "store_member_attempt_email_storeId_email_key" ON "store_member_attempt_email"("storeId", "email");

-- AddForeignKey
ALTER TABLE "store_member_attempt_email" ADD CONSTRAINT "store_member_attempt_email_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_member_attempt_email" ADD CONSTRAINT "store_member_attempt_email_nisitId_fkey" FOREIGN KEY ("nisitId") REFERENCES "nisit"("nisitId") ON DELETE SET NULL ON UPDATE CASCADE;
