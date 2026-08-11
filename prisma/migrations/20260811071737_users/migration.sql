-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "loginAttempts" INTEGER NOT NULL DEFAULT 0;
