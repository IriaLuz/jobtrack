-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('saved', 'applied', 'interviewing', 'offered', 'rejected');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('ai', 'question_bank');

-- CreateEnum
CREATE TYPE "ExerciseStatus" AS ENUM ('unanswered', 'graded', 'off_task', 'grading_unavailable');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'saved',
    "link" TEXT NOT NULL,
    "salary" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "jobApplicationId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionSource" "QuestionSource" NOT NULL,
    "status" "ExerciseStatus" NOT NULL DEFAULT 'unanswered',
    "answer" TEXT,
    "score" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "JobApplication_userId_updatedAt_idx" ON "JobApplication"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Exercise_jobApplicationId_createdAt_idx" ON "Exercise"("jobApplicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_jobApplicationId_fkey" FOREIGN KEY ("jobApplicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
