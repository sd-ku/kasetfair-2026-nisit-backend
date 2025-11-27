-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NeedFix', 'Pending', 'Rejected', 'deleted');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- CreateTable
CREATE TABLE "store_review_draft" (
    "id" TEXT NOT NULL,
    "storeId" INTEGER NOT NULL,
    "adminId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_review_draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_email_key" ON "system_admin"("email");

-- AddForeignKey
ALTER TABLE "store_review_draft" ADD CONSTRAINT "store_review_draft_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_review_draft" ADD CONSTRAINT "store_review_draft_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "system_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
