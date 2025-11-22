/*
  Warnings:

  - You are about to drop the `StoreQuestionAnswer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StoreQuestionTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StoreQuestionAnswer" DROP CONSTRAINT "StoreQuestionAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "StoreQuestionAnswer" DROP CONSTRAINT "StoreQuestionAnswer_storeId_fkey";

-- DropTable
DROP TABLE "StoreQuestionAnswer";

-- DropTable
DROP TABLE "StoreQuestionTemplate";

-- CreateTable
CREATE TABLE "store_question_template" (
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

    CONSTRAINT "store_question_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_question_answer" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_question_answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_question_template_key_key" ON "store_question_template"("key");

-- CreateIndex
CREATE UNIQUE INDEX "store_question_answer_storeId_questionId_key" ON "store_question_answer"("storeId", "questionId");

-- AddForeignKey
ALTER TABLE "store_question_answer" ADD CONSTRAINT "store_question_answer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_question_answer" ADD CONSTRAINT "store_question_answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "store_question_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
