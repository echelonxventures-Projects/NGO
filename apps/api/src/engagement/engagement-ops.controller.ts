import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { EngagementOpsService } from './engagement-ops.service';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { AddBenefitDto, CheckInDto, LogHoursDto, VerifyHoursDto } from './dto/engagement-ops.dto';

@Controller()
export class EngagementOpsController {
  constructor(private readonly ops: EngagementOpsService) {}

  // ---------- Event tickets + check-in ----------

  @Get('event-registrations/:id/ticket')
  ticket(@Param('id') id: string) {
    return this.ops.ticketQr(id);
  }

  @RequirePermissions(PERMISSIONS.EVENT_WRITE)
  @Post('events/check-in')
  checkIn(@Body() dto: CheckInDto) {
    return this.ops.checkIn(dto);
  }

  @RequirePermissions(PERMISSIONS.EVENT_READ)
  @Get('events/:eventId/attendance')
  attendance(@Param('eventId') eventId: string) {
    return this.ops.eventAttendance(eventId);
  }

  // ---------- Volunteer hours ----------

  @RequirePermissions(PERMISSIONS.VOLUNTEER_WRITE)
  @Post('volunteer-hours')
  logHours(@Body() dto: LogHoursDto) {
    return this.ops.logHours(dto);
  }

  @RequirePermissions(PERMISSIONS.VOLUNTEER_WRITE)
  @Put('volunteer-hours/:id/verify')
  verifyHours(@Param('id') id: string, @Body() dto: VerifyHoursDto) {
    return this.ops.verifyHours(id, dto);
  }

  @RequirePermissions(PERMISSIONS.VOLUNTEER_READ)
  @Get('volunteer-signups/:signupId/hours')
  hours(@Param('signupId') signupId: string) {
    return this.ops.hoursForSignup(signupId);
  }

  // ---------- Membership benefits ----------

  @RequirePermissions(PERMISSIONS.MEMBERSHIP_WRITE)
  @Post('membership-benefits')
  addBenefit(@Body() dto: AddBenefitDto) {
    return this.ops.addBenefit(dto);
  }

  @Get('membership-plans/:planId/benefits')
  benefits(@Param('planId') planId: string) {
    return this.ops.benefitsForPlan(planId);
  }

  @Get('my/entitlements')
  entitlements(@CurrentUser() me: AuthUser) {
    return this.ops.entitlementsForUser(me.userId);
  }
}
