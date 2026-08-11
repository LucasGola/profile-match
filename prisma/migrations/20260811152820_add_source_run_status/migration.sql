-- CreateEnum
CREATE TYPE "SourceRunStatus" AS ENUM ('success', 'error');

-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ADD COLUMN     "lastRunDurationMs" INTEGER,
ADD COLUMN     "lastRunStatus" "SourceRunStatus";
