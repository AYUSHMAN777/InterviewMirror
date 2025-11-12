-- AlterTable
ALTER TABLE "public"."Assessment" ADD COLUMN     "feedback" JSONB,
ADD COLUMN     "transcript" JSONB,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'QUIZ';
