import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async updateFcmToken(userId: string, fcmToken: string) {
    const id = this.parseUserId(userId);

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user.');
    }

    return this.prisma.user.update({
      where: { id },
      data: { fcmToken },
      select: {
        id: true,
        email: true,
        name: true,
        fcmToken: true,
      },
    });
  }

  async sendTestPushNotification(userId: string, title: string, body: string) {
    const id = this.parseUserId(userId);

    const user = await this.prisma.user.findUnique({
      where: { id },
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

  private parseUserId(userId: string): number {
    const id = Number(userId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('userId không hợp lệ.');
    }

    return id;
  }
}
