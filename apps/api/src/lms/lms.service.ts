import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import {
  CreateCourseDto,
  CreateLessonDto,
  CreateModuleDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateModuleDto,
} from './dto/lms.dto';

/**
 * LMS core. All course/module/lesson/enrollment data is tenant-owned and accessed via
 * `prisma.scoped()`, so tenantId is injected automatically and cross-tenant access is
 * impossible. Lesson content is only revealed to enrolled users (or preview lessons).
 */
@Injectable()
export class LmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  // ---------- Authoring (teacher/admin) ----------

  listCourses() {
    return this.prisma.scoped().course.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { modules: true, enrollments: true } } },
    });
  }

  async createCourse(dto: CreateCourseDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const existing = await this.prisma.scoped().course.findFirst({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('A course with this slug already exists');
    return this.prisma.scoped().course.create({
      data: {
        tenantId,
        slug: dto.slug,
        title: dto.title,
        summary: dto.summary,
        description: dto.description,
        coverUrl: dto.coverUrl,
        price: dto.price ?? 0,
        currency: dto.currency ?? 'INR',
        instructorId: dto.instructorId,
      },
    });
  }

  private async requireCourse(id: string) {
    const course = await this.prisma.scoped().course.findFirst({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    await this.requireCourse(id);
    return this.prisma.scoped().course.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        summary: dto.summary ?? undefined,
        description: dto.description ?? undefined,
        coverUrl: dto.coverUrl ?? undefined,
        status: dto.status ?? undefined,
        price: dto.price ?? undefined,
        currency: dto.currency ?? undefined,
        instructorId: dto.instructorId ?? undefined,
      },
    });
  }

  async setPublished(id: string, published: boolean) {
    await this.requireCourse(id);
    return this.prisma.scoped().course.update({
      where: { id },
      data: {
        status: published ? 'PUBLISHED' : 'DRAFT',
        publishedAt: published ? new Date() : null,
      },
    });
  }

  async deleteCourse(id: string) {
    await this.requireCourse(id);
    await this.prisma.scoped().course.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- Modules ----------

  async addModule(courseId: string, dto: CreateModuleDto) {
    await this.requireCourse(courseId);
    const tenantId = this.tenantContext.requireTenantId();
    const count = await this.prisma.scoped().courseModule.count({ where: { courseId } });
    return this.prisma.scoped().courseModule.create({
      data: { tenantId, courseId, title: dto.title, order: dto.order ?? count },
    });
  }

  private async requireModule(id: string) {
    const mod = await this.prisma.scoped().courseModule.findFirst({ where: { id } });
    if (!mod) throw new NotFoundException('Module not found');
    return mod;
  }

  async updateModule(id: string, dto: UpdateModuleDto) {
    await this.requireModule(id);
    return this.prisma.scoped().courseModule.update({
      where: { id },
      data: { title: dto.title ?? undefined, order: dto.order ?? undefined },
    });
  }

  async deleteModule(id: string) {
    await this.requireModule(id);
    await this.prisma.scoped().courseModule.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- Lessons ----------

  async addLesson(moduleId: string, dto: CreateLessonDto) {
    const mod = await this.requireModule(moduleId);
    const tenantId = this.tenantContext.requireTenantId();
    const count = await this.prisma.scoped().lesson.count({ where: { moduleId } });
    return this.prisma.scoped().lesson.create({
      data: {
        tenantId,
        moduleId: mod.id,
        title: dto.title,
        type: dto.type ?? 'TEXT',
        order: dto.order ?? count,
        content: dto.content ?? {},
        videoUrl: dto.videoUrl,
        durationSec: dto.durationSec ?? 0,
        isPreview: dto.isPreview ?? false,
      },
    });
  }

  private async requireLesson(id: string) {
    const lesson = await this.prisma.scoped().lesson.findFirst({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async updateLesson(id: string, dto: UpdateLessonDto) {
    await this.requireLesson(id);
    return this.prisma.scoped().lesson.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        type: dto.type ?? undefined,
        order: dto.order ?? undefined,
        content: (dto.content ?? undefined) as object | undefined,
        videoUrl: dto.videoUrl ?? undefined,
        durationSec: dto.durationSec ?? undefined,
        isPreview: dto.isPreview ?? undefined,
      },
    });
  }

  async deleteLesson(id: string) {
    await this.requireLesson(id);
    await this.prisma.scoped().lesson.delete({ where: { id } });
    return { ok: true };
  }

  /** Full course tree for the authoring UI (all lessons, full content). */
  async getCourseTree(id: string) {
    await this.requireCourse(id);
    return this.prisma.scoped().course.findFirst({
      where: { id },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });
  }

  // ---------- Public catalog ----------

  listPublished() {
    return this.prisma.scoped().course.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      include: { _count: { select: { modules: true, enrollments: true } } },
    });
  }

  /**
   * Public course detail by slug. Returns the module/lesson outline. Lesson `content` is
   * stripped unless the lesson is a preview — full content requires enrollment.
   */
  async getPublishedBySlug(slug: string) {
    const course = await this.prisma.scoped().course.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return {
      ...course,
      modules: course.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          order: l.order,
          durationSec: l.durationSec,
          isPreview: l.isPreview,
          content: l.isPreview ? l.content : undefined,
        })),
      })),
    };
  }

  // ---------- Enrollment & progress (student) ----------

  private async totalLessons(courseId: string) {
    const modules = await this.prisma.scoped().courseModule.findMany({
      where: { courseId },
      select: { id: true },
    });
    if (modules.length === 0) return 0;
    return this.prisma.scoped().lesson.count({
      where: { moduleId: { in: modules.map((m) => m.id) } },
    });
  }

  async enroll(courseId: string, userId: string) {
    const course = await this.prisma.scoped().course.findFirst({
      where: { id: courseId, status: 'PUBLISHED' },
    });
    if (!course) throw new NotFoundException('Course not found or not published');
    const tenantId = this.tenantContext.requireTenantId();
    const existing = await this.prisma.scoped().enrollment.findFirst({
      where: { courseId, userId },
    });
    if (existing) return existing;
    return this.prisma.scoped().enrollment.create({
      data: { tenantId, courseId, userId },
    });
  }

  myEnrollments(userId: string) {
    return this.prisma.scoped().enrollment.findMany({
      where: { userId },
      orderBy: { enrolledAt: 'desc' },
      include: { course: { select: { id: true, slug: true, title: true, coverUrl: true } } },
    });
  }

  /** Course content for an enrolled learner, with per-lesson completion flags. */
  async learn(courseId: string, userId: string) {
    const enrollment = await this.prisma.scoped().enrollment.findFirst({
      where: { courseId, userId },
    });
    if (!enrollment) throw new BadRequestException('You are not enrolled in this course');

    const course = await this.prisma.scoped().course.findFirst({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const progress = await this.prisma.scoped().lessonProgress.findMany({
      where: { enrollmentId: enrollment.id },
    });
    const done = new Set(progress.filter((p) => p.completed).map((p) => p.lessonId));

    return {
      enrollment,
      course: {
        ...course,
        modules: course.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => ({ ...l, completed: done.has(l.id) })),
        })),
      },
    };
  }

  /** Marks a lesson complete for the user's enrollment and recomputes progress. */
  async completeLesson(lessonId: string, userId: string) {
    const lesson = await this.requireLesson(lessonId);
    const mod = await this.prisma.scoped().courseModule.findFirst({
      where: { id: lesson.moduleId },
    });
    if (!mod) throw new NotFoundException('Lesson module not found');

    const enrollment = await this.prisma.scoped().enrollment.findFirst({
      where: { courseId: mod.courseId, userId },
    });
    if (!enrollment) throw new BadRequestException('You are not enrolled in this course');

    const tenantId = this.tenantContext.requireTenantId();
    await this.prisma.scoped().lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: { tenantId, enrollmentId: enrollment.id, lessonId, completed: true, completedAt: new Date() },
      update: { completed: true, completedAt: new Date() },
    });

    const total = await this.totalLessons(mod.courseId);
    const completed = await this.prisma.scoped().lessonProgress.count({
      where: { enrollmentId: enrollment.id, completed: true },
    });
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return this.prisma.scoped().enrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPct: pct,
        status: pct >= 100 ? 'COMPLETED' : 'ACTIVE',
        completedAt: pct >= 100 ? new Date() : null,
      },
    });
  }
}
