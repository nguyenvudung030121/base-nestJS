import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user.');
    }

    return user;
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
      select: {
        id: true,
        email: true,
        fullName: true,
        fcmToken: true,
      },
    });
  }

  async sendTestPushNotification(userId: string, title: string, body: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fcmToken: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user.');
    }

    if (!user.fcmToken) {
      throw new BadRequestException('User chưa có FCM token.');
    }

    const messageId = await this.firebaseService.sendPushNotification(
      user.fcmToken,
      title,
      body,
    );

    return {
      userId: user.id,
      messageId,
    };
  }

  // 1. Hàm cập nhật ROLE (Dành cho Admin)
  async updateRole(id: string, dto: UpdateRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy nhân viên này');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
    });

    const { password, ...result } = updated;
    return result;
  }

  // 2. Hàm cập nhật DEPARTMENT (Dành cho Manager)
  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy nhân viên này');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { department: dto.department },
    });

    const { password, ...result } = updated;
    return result;
  }
}
