import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto/user.dto';
import { RequirePermissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermissions(PERMISSIONS.USER_READ)
  @Get()
  list() {
    return this.users.list();
  }

  /** Roles available in this tenant (for the role picker). */
  @RequirePermissions(PERMISSIONS.USER_READ)
  @Get('roles')
  roles() {
    return this.users.listRoles();
  }

  @RequirePermissions(PERMISSIONS.USER_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @RequirePermissions(PERMISSIONS.USER_WRITE)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @RequirePermissions(PERMISSIONS.USER_WRITE)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() me: AuthUser) {
    return this.users.update(id, dto, me.userId);
  }

  @RequirePermissions(PERMISSIONS.USER_WRITE)
  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.users.resetPassword(id, dto.password);
  }
}
