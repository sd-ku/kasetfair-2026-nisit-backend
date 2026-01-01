-- CreateTable
CREATE TABLE "lucky_draw" (
    "id" SERIAL NOT NULL,
    "winner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lucky_draw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lucky_draw_entry" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "storeName" TEXT NOT NULL,
    "isDrawn" BOOLEAN NOT NULL DEFAULT false,
    "drawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lucky_draw_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lucky_draw_entry_isDrawn_idx" ON "lucky_draw_entry"("isDrawn");

-- CreateIndex
CREATE INDEX "lucky_draw_entry_storeId_idx" ON "lucky_draw_entry"("storeId");
