-- AlterTable
ALTER TABLE "nisit" ADD COLUMN     "dormitoryTypeId" INTEGER;

-- AlterTable
ALTER TABLE "store" ADD COLUMN     "goodType" "GoodsType";

-- CreateTable
CREATE TABLE "dormitory_type" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER,

    CONSTRAINT "dormitory_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dormitory_type_label_key" ON "dormitory_type"("label");

-- AddForeignKey
ALTER TABLE "nisit" ADD CONSTRAINT "nisit_dormitoryTypeId_fkey" FOREIGN KEY ("dormitoryTypeId") REFERENCES "dormitory_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;
