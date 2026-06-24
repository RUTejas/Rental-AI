-- Keeps historical rental records recoverable instead of permanently deleting them.
ALTER TABLE "RentalRecord" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
