/*
  Warnings:

  - The values [Success,Validated] on the enum `StoreState` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StoreState_new" AS ENUM ('CreateStore', 'ClubInfo', 'StoreDetails', 'ProductDetails', 'Submitted', 'Pending', 'Approved', 'Rejected');
ALTER TABLE "public"."store" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "store" ALTER COLUMN "state" TYPE "StoreState_new" USING ("state"::text::"StoreState_new");
ALTER TYPE "StoreState" RENAME TO "StoreState_old";
ALTER TYPE "StoreState_new" RENAME TO "StoreState";
DROP TYPE "public"."StoreState_old";
ALTER TABLE "store" ALTER COLUMN "state" SET DEFAULT 'CreateStore';
COMMIT;
