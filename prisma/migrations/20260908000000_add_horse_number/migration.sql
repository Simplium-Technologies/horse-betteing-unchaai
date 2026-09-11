-- AlterTable
ALTER TABLE "Horse" ADD COLUMN "number" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Horse_number_key" ON "Horse"("number");
