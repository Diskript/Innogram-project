-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'READY';
