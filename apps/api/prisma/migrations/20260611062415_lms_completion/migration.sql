-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('MCQ', 'ESSAY', 'SUBJECTIVE', 'VIVA', 'CODING', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "ExamAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ExamType" NOT NULL DEFAULT 'MCQ',
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "totalPoints" INTEGER NOT NULL DEFAULT 100,
    "passingPct" INTEGER NOT NULL DEFAULT 40,
    "randomize" BOOLEAN NOT NULL DEFAULT false,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "scheduledAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "score" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "status" "ExamAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "timestamp" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_replies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_attendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "method" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrollmentNo" TEXT NOT NULL,
    "qrPayload" TEXT NOT NULL,
    "guardian" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "qrPayload" TEXT NOT NULL,
    "bio" TEXT,
    "subjects" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exams_tenantId_idx" ON "exams"("tenantId");

-- CreateIndex
CREATE INDEX "exams_tenantId_courseId_idx" ON "exams"("tenantId", "courseId");

-- CreateIndex
CREATE INDEX "exam_attempts_tenantId_idx" ON "exam_attempts"("tenantId");

-- CreateIndex
CREATE INDEX "exam_attempts_examId_userId_idx" ON "exam_attempts"("examId", "userId");

-- CreateIndex
CREATE INDEX "lesson_notes_tenantId_idx" ON "lesson_notes"("tenantId");

-- CreateIndex
CREATE INDEX "lesson_notes_tenantId_lessonId_userId_idx" ON "lesson_notes"("tenantId", "lessonId", "userId");

-- CreateIndex
CREATE INDEX "discussions_tenantId_idx" ON "discussions"("tenantId");

-- CreateIndex
CREATE INDEX "discussions_tenantId_courseId_idx" ON "discussions"("tenantId", "courseId");

-- CreateIndex
CREATE INDEX "discussion_replies_tenantId_idx" ON "discussion_replies"("tenantId");

-- CreateIndex
CREATE INDEX "discussion_replies_discussionId_idx" ON "discussion_replies"("discussionId");

-- CreateIndex
CREATE INDEX "class_attendance_tenantId_idx" ON "class_attendance"("tenantId");

-- CreateIndex
CREATE INDEX "class_attendance_tenantId_courseId_userId_idx" ON "class_attendance"("tenantId", "courseId", "userId");

-- CreateIndex
CREATE INDEX "student_profiles_tenantId_idx" ON "student_profiles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_tenantId_userId_key" ON "student_profiles"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_tenantId_enrollmentNo_key" ON "student_profiles"("tenantId", "enrollmentNo");

-- CreateIndex
CREATE INDEX "teacher_profiles_tenantId_idx" ON "teacher_profiles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_profiles_tenantId_userId_key" ON "teacher_profiles"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_profiles_tenantId_staffId_key" ON "teacher_profiles"("tenantId", "staffId");

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
