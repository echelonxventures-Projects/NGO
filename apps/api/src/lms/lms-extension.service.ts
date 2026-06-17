import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExamType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { QrService } from '../common/qr/qr.service';
import { ExamQuestion, gradeMcqExam } from './exam-grading';
import {
  CreateDiscussionDto,
  CreateExamDto,
  CreateNoteDto,
  IssueStudentIdDto,
  IssueTeacherIdDto,
  MarkAttendanceDto,
  ReplyDto,
  SubmitExamDto,
} from './dto/lms-extension.dto';

/**
 * LMS completion features: exams (objective auto-graded, subjective teacher-graded), lesson
 * notes, course discussions, class attendance, and student/teacher ID issuance with QR codes.
 */
@Injectable()
export class LmsExtensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly qr: QrService,
  ) {}

  // ---------- Exams ----------

  createExam(dto: CreateExamDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const questions = (dto.questions ?? []) as { points?: number }[];
    const totalPoints = questions.reduce((s, q) => s + (q.points ?? 1), 0) || 100;
    return this.prisma.scoped().exam.create({
      data: {
        tenantId,
        courseId: dto.courseId,
        title: dto.title,
        type: (dto.type as ExamType) ?? 'MCQ',
        durationMin: dto.durationMin ?? 60,
        passingPct: dto.passingPct ?? 40,
        randomize: dto.randomize ?? false,
        questions: dto.questions ?? [],
        totalPoints,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  publishExam(id: string, published: boolean) {
    return this.prisma.scoped().exam.update({ where: { id }, data: { published } });
  }

  listExams(courseId: string) {
    return this.prisma.scoped().exam.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Learner view of an exam — correct answers are stripped from questions. */
  async getExamForLearner(id: string) {
    const exam = await this.prisma.scoped().exam.findFirst({ where: { id, published: true } });
    if (!exam) throw new NotFoundException('Exam not found');
    const questions = (exam.questions as unknown as ExamQuestion[]).map((q) => ({
      prompt: q.prompt,
      options: q.options,
      points: q.points,
    }));
    return { ...exam, questions };
  }

  async submitExam(examId: string, userId: string, dto: SubmitExamDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const exam = await this.prisma.scoped().exam.findFirst({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    const isObjective = exam.type === 'MCQ';
    const questions = exam.questions as unknown as ExamQuestion[];
    let score = 0;
    let passed = false;
    if (isObjective) {
      const result = gradeMcqExam(questions, dto.answers, exam.passingPct);
      score = result.score;
      passed = result.passed;
    }

    return this.prisma.scoped().examAttempt.create({
      data: {
        tenantId,
        examId,
        userId,
        answers: dto.answers,
        score,
        passed,
        status: isObjective ? 'GRADED' : 'SUBMITTED',
        submittedAt: new Date(),
        gradedAt: isObjective ? new Date() : null,
      },
    });
  }

  async gradeAttempt(attemptId: string, score: number, passingPct = 40) {
    const attempt = await this.prisma.scoped().examAttempt.findFirst({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    return this.prisma.scoped().examAttempt.update({
      where: { id: attemptId },
      data: { score, passed: score >= passingPct, status: 'GRADED', gradedAt: new Date() },
    });
  }

  // ---------- Notes ----------

  createNote(userId: string, dto: CreateNoteDto) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().lessonNote.create({
      data: { tenantId, userId, lessonId: dto.lessonId, body: dto.body, timestamp: dto.timestamp },
    });
  }

  listNotes(userId: string, lessonId: string) {
    return this.prisma.scoped().lessonNote.findMany({
      where: { userId, lessonId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteNote(userId: string, id: string) {
    await this.prisma.scoped().lessonNote.deleteMany({ where: { id, userId } });
    return { ok: true };
  }

  // ---------- Discussions ----------

  createDiscussion(userId: string, dto: CreateDiscussionDto) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().discussion.create({
      data: {
        tenantId,
        userId,
        courseId: dto.courseId,
        lessonId: dto.lessonId,
        title: dto.title,
        body: dto.body,
      },
    });
  }

  listDiscussions(courseId: string) {
    return this.prisma.scoped().discussion.findMany({
      where: { courseId },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      include: { _count: { select: { replies: true } } },
    });
  }

  async getDiscussion(id: string) {
    const discussion = await this.prisma.scoped().discussion.findFirst({
      where: { id },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });
    if (!discussion) throw new NotFoundException('Discussion not found');
    return discussion;
  }

  async reply(discussionId: string, userId: string, dto: ReplyDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const exists = await this.prisma.scoped().discussion.findFirst({ where: { id: discussionId } });
    if (!exists) throw new NotFoundException('Discussion not found');
    return this.prisma.scoped().discussionReply.create({
      data: { tenantId, discussionId, userId, body: dto.body },
    });
  }

  // ---------- Attendance ----------

  markAttendance(dto: MarkAttendanceDto) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().classAttendance.create({
      data: {
        tenantId,
        courseId: dto.courseId,
        userId: dto.userId,
        status: (dto.status as never) ?? 'PRESENT',
        method: dto.method ?? 'manual',
        sessionId: dto.sessionId,
      },
    });
  }

  attendanceForCourse(courseId: string) {
    return this.prisma.scoped().classAttendance.findMany({
      where: { courseId },
      orderBy: { date: 'desc' },
    });
  }

  // ---------- Student / Teacher IDs with QR ----------

  async issueStudentId(dto: IssueStudentIdDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const enrollmentNo = dto.enrollmentNo ?? (await this.nextEnrollmentNo());
    const qrPayload = `student:${tenantId}:${dto.userId}:${enrollmentNo}`;
    const profile = await this.prisma.scoped().studentProfile.upsert({
      where: { tenantId_userId: { tenantId, userId: dto.userId } },
      create: {
        tenantId,
        userId: dto.userId,
        enrollmentNo,
        qrPayload,
        guardian: dto.guardian,
        phone: dto.phone,
      },
      update: { guardian: dto.guardian, phone: dto.phone },
    });
    const qrSvg = await this.qr.toSvg(profile.qrPayload);
    return { ...profile, qrSvg };
  }

  async issueTeacherId(dto: IssueTeacherIdDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const staffId = dto.staffId ?? `STF-${Date.now().toString(36).toUpperCase()}`;
    const qrPayload = `teacher:${tenantId}:${dto.userId}:${staffId}`;
    const profile = await this.prisma.scoped().teacherProfile.upsert({
      where: { tenantId_userId: { tenantId, userId: dto.userId } },
      create: { tenantId, userId: dto.userId, staffId, qrPayload, bio: dto.bio, subjects: dto.subjects ?? [] },
      update: { bio: dto.bio, subjects: dto.subjects ?? undefined },
    });
    const qrSvg = await this.qr.toSvg(profile.qrPayload);
    return { ...profile, qrSvg };
  }

  private async nextEnrollmentNo(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.scoped().studentProfile.count();
    return `EN${year}${String(count + 1).padStart(5, '0')}`;
  }
}
