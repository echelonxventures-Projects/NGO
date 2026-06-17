import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { LmsExtensionService } from './lms-extension.service';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
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

@Controller()
export class LmsExtensionController {
  constructor(private readonly ext: LmsExtensionService) {}

  // ---------- Exams ----------

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Post('exams')
  createExam(@Body() dto: CreateExamDto) {
    return this.ext.createExam(dto);
  }

  @RequirePermissions(PERMISSIONS.COURSE_PUBLISH)
  @Post('exams/:id/publish')
  publishExam(@Param('id') id: string) {
    return this.ext.publishExam(id, true);
  }

  @RequirePermissions(PERMISSIONS.COURSE_READ)
  @Get('courses/:courseId/exams')
  listExams(@Param('courseId') courseId: string) {
    return this.ext.listExams(courseId);
  }

  @RequirePermissions(PERMISSIONS.COURSE_READ)
  @Get('exams/:id/take')
  takeExam(@Param('id') id: string) {
    return this.ext.getExamForLearner(id);
  }

  @Post('exams/:id/submit')
  submitExam(@Param('id') id: string, @Body() dto: SubmitExamDto, @CurrentUser() me: AuthUser) {
    return this.ext.submitExam(id, me.userId, dto);
  }

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Put('exam-attempts/:id/grade')
  gradeAttempt(@Param('id') id: string, @Body() body: { score: number; passingPct?: number }) {
    return this.ext.gradeAttempt(id, body.score, body.passingPct);
  }

  // ---------- Notes ----------

  @Post('notes')
  createNote(@Body() dto: CreateNoteDto, @CurrentUser() me: AuthUser) {
    return this.ext.createNote(me.userId, dto);
  }

  @Get('lessons/:lessonId/notes')
  notes(@Param('lessonId') lessonId: string, @CurrentUser() me: AuthUser) {
    return this.ext.listNotes(me.userId, lessonId);
  }

  @Delete('notes/:id')
  deleteNote(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.ext.deleteNote(me.userId, id);
  }

  // ---------- Discussions ----------

  @Post('discussions')
  createDiscussion(@Body() dto: CreateDiscussionDto, @CurrentUser() me: AuthUser) {
    return this.ext.createDiscussion(me.userId, dto);
  }

  @Get('courses/:courseId/discussions')
  discussions(@Param('courseId') courseId: string) {
    return this.ext.listDiscussions(courseId);
  }

  @Get('discussions/:id')
  discussion(@Param('id') id: string) {
    return this.ext.getDiscussion(id);
  }

  @Post('discussions/:id/replies')
  reply(@Param('id') id: string, @Body() dto: ReplyDto, @CurrentUser() me: AuthUser) {
    return this.ext.reply(id, me.userId, dto);
  }

  // ---------- Attendance ----------

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Post('attendance')
  markAttendance(@Body() dto: MarkAttendanceDto) {
    return this.ext.markAttendance(dto);
  }

  @RequirePermissions(PERMISSIONS.COURSE_READ)
  @Get('courses/:courseId/attendance')
  attendance(@Param('courseId') courseId: string) {
    return this.ext.attendanceForCourse(courseId);
  }

  // ---------- Student / Teacher IDs ----------

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Post('student-ids')
  issueStudentId(@Body() dto: IssueStudentIdDto) {
    return this.ext.issueStudentId(dto);
  }

  @RequirePermissions(PERMISSIONS.COURSE_WRITE)
  @Post('teacher-ids')
  issueTeacherId(@Body() dto: IssueTeacherIdDto) {
    return this.ext.issueTeacherId(dto);
  }
}
