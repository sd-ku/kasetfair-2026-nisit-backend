-- DropIndex
DROP INDEX "consent_text_language_active_key";

-- CreateIndex
CREATE INDEX "consent_text_language_active_idx" ON "consent_text"("language", "active");
