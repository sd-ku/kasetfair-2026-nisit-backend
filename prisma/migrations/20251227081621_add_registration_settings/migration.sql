-- CreateTable
CREATE TABLE "registration_settings" (
    "id" SERIAL NOT NULL,
    "isManuallyLocked" BOOLEAN NOT NULL DEFAULT false,
    "registrationStart" TIMESTAMP(3),
    "registrationEnd" TIMESTAMP(3),
    "lockMessage" TEXT NOT NULL DEFAULT 'ขณะนี้หมดเวลาลงทะเบียนแล้ว กรุณาติดต่อเจ้าหน้าที่หากมีข้อสงสัย',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_settings_pkey" PRIMARY KEY ("id")
);
