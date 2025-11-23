/*
  Warnings:

  - A unique constraint covering the columns `[storeName]` on the table `store` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "store_storeName_key" ON "store"("storeName");
