/*
  Warnings:

  - You are about to drop the column `publishd` on the `Form` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Form_id_publishd_createdAt_idx";

-- AlterTable
ALTER TABLE "Form" DROP COLUMN "publishd",
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Form_id_published_createdAt_idx" ON "Form"("id", "published", "createdAt");
