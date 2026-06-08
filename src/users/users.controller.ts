import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { TestPushDto } from './dto/test-push.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { UsersService } from './users.service';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { ManagerGuard } from 'src/auth/guards/manager.guard';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

type AuthenticatedRequest = Request & {
  user: {
    sub: number | string;
  };
};

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin cá nhân của user đang đăng nhập' })
  getProfile(@Req() request: AuthenticatedRequest) {
    const userId = String(request.user.sub);
    return this.usersService.getProfile(userId);
  }

  @Patch('fcm-token')
  @ApiOperation({ summary: 'Cập nhật FCM token của user đang đăng nhập' })
  updateFcmToken(
    @Body() dto: UpdateFcmTokenDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const userId = String(request.user.sub);

    return this.usersService.updateFcmToken(userId, dto.fcmToken);
  }

  @Post('test-push')
  @ApiOperation({ summary: 'Endpoint tạm thời để test bắn push notification' })
  testPush(@Body() dto: TestPushDto) {
    return this.usersService.sendTestPushNotification(
      String(dto.userId),
      dto.title,
      dto.body,
    );
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Cập nhật quyền hạn user (Admin only)' })
  @UseGuards(AdminGuard) // Chỉ Admin được vào
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, dto);
  }

  @Patch(':id/department')
  @ApiOperation({ summary: 'Cập nhật phòng ban (Manager only)' })
  @UseGuards(ManagerGuard) // Chỉ Manager được vào
  updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.usersService.updateDepartment(id, dto);
  }
}
