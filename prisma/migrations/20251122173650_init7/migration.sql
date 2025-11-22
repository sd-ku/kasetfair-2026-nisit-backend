/*
  Warnings:

  - The values [Approved] on the enum `StoreState` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "StoreQuestionType" AS ENUM ('TEXT', 'SINGLE_SELECT', 'MULTI_SELECT');

-- AlterEnum
BEGIN;
CREATE TYPE "StoreState_new" AS ENUM ('CreateStore', 'ClubInfo', 'StoreDetails', 'ProductDetails', 'Submitted', 'Pending', 'Validated', 'Success', 'Rejected');
ALTER TABLE "public"."store" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "store" ALTER COLUMN "state" TYPE "StoreState_new" USING ("state"::text::"StoreState_new");
ALTER TYPE "StoreState" RENAME TO "StoreState_old";
ALTER TYPE "StoreState_new" RENAME TO "StoreState";
DROP TYPE "public"."StoreState_old";
ALTER TABLE "store" ALTER COLUMN "state" SET DEFAULT 'CreateStore';
COMMIT;

-- CreateTable
CREATE TABLE "StoreQuestionTemplate" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" "StoreQuestionType" NOT NULL,
    "options" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreQuestionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreQuestionAnswer" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreQuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreQuestionTemplate_key_key" ON "StoreQuestionTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "StoreQuestionAnswer_storeId_questionId_key" ON "StoreQuestionAnswer"("storeId", "questionId");

-- AddForeignKey
ALTER TABLE "StoreQuestionAnswer" ADD CONSTRAINT "StoreQuestionAnswer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreQuestionAnswer" ADD CONSTRAINT "StoreQuestionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "StoreQuestionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
