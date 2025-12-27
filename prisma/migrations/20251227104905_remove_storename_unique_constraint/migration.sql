-- DropIndex
DROP INDEX "store_storeName_key";

-- CreateIndex
CREATE INDEX "store_storeName_state_idx" ON "store"("storeName", "state");
