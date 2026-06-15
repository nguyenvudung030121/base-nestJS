-- CreateEnum
CREATE TYPE "LeaveSlot" AS ENUM ('FULL', 'MORNING', 'AFTERNOON');

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "leaveSlot" "LeaveSlot" NOT NULL DEFAULT 'FULL';
