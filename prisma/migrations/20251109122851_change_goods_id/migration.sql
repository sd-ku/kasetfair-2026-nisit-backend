/*
  Warnings:

  - The primary key for the `goods` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "goods" DROP CONSTRAINT "goods_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "goods_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "goods_id_seq";
