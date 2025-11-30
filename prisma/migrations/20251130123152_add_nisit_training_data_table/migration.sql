-- CreateTable
CREATE TABLE "nisit_training_participant" (
    "id" TEXT NOT NULL,
    "nisitId" TEXT NOT NULL,

    CONSTRAINT "nisit_training_participant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nisit_training_participant_nisitId_key" ON "nisit_training_participant"("nisitId");

-- CreateIndex
CREATE INDEX "nisit_training_participant_nisitId_idx" ON "nisit_training_participant"("nisitId");
