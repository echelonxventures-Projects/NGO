import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import {
  CreateCommentDto,
  CreateEventDto,
  CreateOpportunityDto,
  CreatePlanDto,
  CreatePostDto,
  RegisterEventDto,
  SignupVolunteerDto,
  UpdateEventDto,
  UpdateOpportunityDto,
  UpdatePlanDto,
  UpdateSignupDto,
} from './dto/engagement.dto';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';

@Controller()
export class EngagementController {
  constructor(private readonly svc: EngagementService) {}

  // ===== Events =====
  @Public() @Get('events') eventsPublic() { return this.svc.listEventsPublic(); }
  @Public() @Get('events/slug/:slug') eventBySlug(@Param('slug') s: string) { return this.svc.getEventPublic(s); }
  @Public() @Post('events/:id/register')
  register(@Param('id') id: string, @Body() dto: RegisterEventDto) { return this.svc.registerForEvent(id, dto); }

  @RequirePermissions(PERMISSIONS.EVENT_READ) @Get('events/all') eventsAdmin() { return this.svc.listEventsAdmin(); }
  @RequirePermissions(PERMISSIONS.EVENT_READ) @Get('events/:id/registrations')
  regs(@Param('id') id: string) { return this.svc.listRegistrations(id); }
  @RequirePermissions(PERMISSIONS.EVENT_WRITE) @Post('events')
  createEvent(@Body() dto: CreateEventDto) { return this.svc.createEvent(dto); }
  @RequirePermissions(PERMISSIONS.EVENT_WRITE) @Put('events/:id')
  updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) { return this.svc.updateEvent(id, dto); }
  @RequirePermissions(PERMISSIONS.EVENT_WRITE) @Post('events/:id/publish')
  pubEvent(@Param('id') id: string) { return this.svc.setEventPublished(id, true); }
  @RequirePermissions(PERMISSIONS.EVENT_WRITE) @Post('events/:id/unpublish')
  unpubEvent(@Param('id') id: string) { return this.svc.setEventPublished(id, false); }
  @RequirePermissions(PERMISSIONS.EVENT_WRITE) @Delete('events/:id')
  delEvent(@Param('id') id: string) { return this.svc.deleteEvent(id); }

  // ===== Volunteers =====
  @Public() @Get('volunteer-opportunities') oppsPublic() { return this.svc.listOpportunitiesPublic(); }
  @Public() @Post('volunteer-opportunities/:id/signup')
  signup(@Param('id') id: string, @Body() dto: SignupVolunteerDto) { return this.svc.signupVolunteer(id, dto); }

  @RequirePermissions(PERMISSIONS.VOLUNTEER_READ) @Get('volunteer-opportunities/all')
  oppsAdmin() { return this.svc.listOpportunitiesAdmin(); }
  @RequirePermissions(PERMISSIONS.VOLUNTEER_WRITE) @Post('volunteer-opportunities')
  createOpp(@Body() dto: CreateOpportunityDto) { return this.svc.createOpportunity(dto); }
  @RequirePermissions(PERMISSIONS.VOLUNTEER_WRITE) @Put('volunteer-opportunities/:id')
  updOpp(@Param('id') id: string, @Body() dto: UpdateOpportunityDto) { return this.svc.updateOpportunity(id, dto); }
  @RequirePermissions(PERMISSIONS.VOLUNTEER_WRITE) @Delete('volunteer-opportunities/:id')
  delOpp(@Param('id') id: string) { return this.svc.deleteOpportunity(id); }
  @RequirePermissions(PERMISSIONS.VOLUNTEER_READ) @Get('volunteer-signups')
  signups(@Query('opportunityId') oid?: string) { return this.svc.listSignups(oid); }
  @RequirePermissions(PERMISSIONS.VOLUNTEER_WRITE) @Put('volunteer-signups/:id')
  updSignup(@Param('id') id: string, @Body() dto: UpdateSignupDto) { return this.svc.updateSignup(id, dto); }

  // ===== Membership =====
  @Public() @Get('membership-plans') plansPublic() { return this.svc.listPlansPublic(); }
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_READ) @Get('membership-plans/all')
  plansAdmin() { return this.svc.listPlansAdmin(); }
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_WRITE) @Post('membership-plans')
  createPlan(@Body() dto: CreatePlanDto) { return this.svc.createPlan(dto); }
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_WRITE) @Put('membership-plans/:id')
  updPlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) { return this.svc.updatePlan(id, dto); }
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_WRITE) @Delete('membership-plans/:id')
  delPlan(@Param('id') id: string) { return this.svc.deletePlan(id); }
  @Post('membership-plans/:id/subscribe')
  subscribe(@Param('id') id: string, @CurrentUser() me: AuthUser) { return this.svc.subscribe(id, me.userId); }
  @Get('my/memberships')
  myMemberships(@CurrentUser() me: AuthUser) { return this.svc.myMemberships(me.userId); }

  // ===== Community =====
  @Public() @Get('community/posts') posts() { return this.svc.listPosts(); }
  @Public() @Get('community/posts/:id') postDetail(@Param('id') id: string) { return this.svc.getPost(id); }
  @Post('community/posts')
  createPost(@Body() dto: CreatePostDto, @CurrentUser() me: AuthUser) {
    return this.svc.createPost(dto, me.userId, me.email);
  }
  @Post('community/posts/:id/comments')
  comment(@Param('id') id: string, @Body() dto: CreateCommentDto, @CurrentUser() me: AuthUser) {
    return this.svc.addComment(id, dto, me.userId, me.email);
  }
  @RequirePermissions(PERMISSIONS.COMMUNITY_MODERATE) @Delete('community/posts/:id')
  delPost(@Param('id') id: string) { return this.svc.deletePost(id); }
  @RequirePermissions(PERMISSIONS.COMMUNITY_MODERATE) @Post('community/posts/:id/pin')
  pin(@Param('id') id: string) { return this.svc.setPinned(id, true); }
  @RequirePermissions(PERMISSIONS.COMMUNITY_MODERATE) @Post('community/posts/:id/unpin')
  unpin(@Param('id') id: string) { return this.svc.setPinned(id, false); }
}
