import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { LmsService } from './lms.service';
import {
  CreateCourseDto,
  CreateLessonDto,
  CreateModuleDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateModuleDto,
} from './dto/lms.dto';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';

@Controller()
export class LmsController {
  constructor(private readonly lms: LmsService) {}

  // ---------- Public catalog ----------

  @Public()
  @Get('courses/published')
  listPublished() {
    return this.lms.listPublished();
  }

  @Public()
  @Get('courses/slug/:slug')
  publicDetail(@Param('slug') slug: string) {
    return this.lms.getPublishedBySlug(slug);
  }

  // ---------- Student (enrolled) ----------

  @Get('my/enrollments')
  myEnrollments(@CurrentUser() me: AuthUser) {
    return this.lms.myEnrollments(me.userId);
  }

  @RequirePermissions(PERMISSIONS.COURSE_READ)
  @Post('courses/:id/enroll')
  enroll(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.lms.enroll(id, me.userId);
  }

  @Get('my/courses/:courseId')
  learn(@Param('courseId') courseId: string, @CurrentUser() me: AuthUser) {
    return this.lms.learn(courseId, me.userId);
  }

  @Post('lessons/:lessonId/complete')
  complete(@Param('lessonId') lessonId: string, @CurrentUser() me: AuthUser) {
    return this.lms.completeLesson(lessonId, me.userId);
  }

  // ---------- Authoring (teacher/admin) ----------

  @RequirePermissions(PERMISSIONS.COURSE_READ)
  @Get('courses')
  list() {
    return this.lms.listCourses();
  }

  @RequirePermissions(PERMISSIONS.COURSE_READ)
  @Get('courses/:id/tree')
  tree(@Param('id') id: string) {
    return this.lms.getCourseTree(id);
  }

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Post('courses')
  create(@Body() dto: CreateCourseDto) {
    return this.lms.createCourse(dto);
  }

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Put('courses/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.lms.updateCourse(id, dto);
  }

  @RequirePermissions(PERMISSIONS.COURSE_PUBLISH)
  @Post('courses/:id/publish')
  publish(@Param('id') id: string) {
    return this.lms.setPublished(id, true);
  }

  @RequirePermissions(PERMISSIONS.COURSE_PUBLISH)
  @Post('courses/:id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.lms.setPublished(id, false);
  }

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Delete('courses/:id')
  remove(@Param('id') id: string) {
    return this.lms.deleteCourse(id);
  }

  // modules
  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Post('courses/:id/modules')
  addModule(@Param('id') id: string, @Body() dto: CreateModuleDto) {
    return this.lms.addModule(id, dto);
  }

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Put('modules/:id')
  updateModule(@Param('id') id: string, @Body() dto: UpdateModuleDto) {
    return this.lms.updateModule(id, dto);
  }

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Delete('modules/:id')
  deleteModule(@Param('id') id: string) {
    return this.lms.deleteModule(id);
  }

  // lessons
  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Post('modules/:id/lessons')
  addLesson(@Param('id') id: string, @Body() dto: CreateLessonDto) {
    return this.lms.addLesson(id, dto);
  }

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Put('lessons/:id')
  updateLesson(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.lms.updateLesson(id, dto);
  }

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Delete('lessons/:id')
  deleteLesson(@Param('id') id: string) {
    return this.lms.deleteLesson(id);
  }
}
