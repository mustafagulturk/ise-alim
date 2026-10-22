-- Adaya gönderilen mülakat saati seçenekleri
-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'BOOKED', 'CANCELLED');

-- CreateTable
CREATE TABLE "InterviewInvite" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "panelistIds" TEXT[],
    "slots" TIMESTAMP(3)[],
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "interviewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookedAt" TIMESTAMP(3),

    CONSTRAINT "InterviewInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewInvite_interviewId_key" ON "InterviewInvite"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewInvite_applicationId_status_idx" ON "InterviewInvite"("applicationId", "status");

-- AddForeignKey
ALTER TABLE "InterviewInvite" ADD CONSTRAINT "InterviewInvite_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

