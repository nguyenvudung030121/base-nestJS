import { Body, Controller, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { TestPushDto } from './dto/test-push.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { UsersService } from './users.service';

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
}
