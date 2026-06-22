import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationScreen } from './firebase.constants';

interface LeaveStatusChangedPayload {
  requestId: string;
  userId: string;
  status: string;
  leaveType: string;
  totalDays: number;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    const keyFile = this.configService.get<string>('FIREBASE_KEY_PATH');

    if (!keyFile) {
      throw new Error('Missing FIREBASE_KEY_PATH environment variable.');
    }

    if (admin.apps.length > 0) {
      return;
    }

    const keyPath = path.join(process.cwd(), keyFile);
    const serviceAccount = JSON.parse(
      fs.readFileSync(keyPath, 'utf8'),
    ) as admin.ServiceAccount;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  @OnEvent('leave.status.changed')
  async handleLeaveStatusChanged(payload: LeaveStatusChangedPayload): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { fcmToken: true },
      });

      if (!user?.fcmToken) return;

      const titleMap: Record<string, string> = {
        APPROVED: 'Đơn phép được phê duyệt ✅',
        REJECTED: 'Đơn phép bị từ chối ❌',
        CANCELLED: 'Đơn phép đã bị hủy 🚫',
      };
      const bodyMap: Record<string, string> = {
        APPROVED: `Đơn xin nghỉ phép ${payload.leaveType} (${payload.totalDays} ngày) của bạn đã được PHÊ DUYỆT.`,
        REJECTED: `Đơn xin nghỉ phép ${payload.leaveType} (${payload.totalDays} ngày) của bạn đã bị TỪ CHỐI.`,
        CANCELLED: `Đơn xin nghỉ phép ${payload.leaveType} (${payload.totalDays} ngày) của bạn đã bị HỦY bởi quản lý.`,
      };

      const title = titleMap[payload.status];
      const body = bodyMap[payload.status];

      if (!title || !body) return; // status không xác định, bỏ qua

      const navigationData = {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        screen: NotificationScreen.LEAVE_SCREEN,
        requestId: payload.requestId,
        status: payload.status,
      };

      await this.sendPushNotification(user.fcmToken, title, body, navigationData);
    } catch (error) {
      // Lỗi FCM (token hết hạn, mạng chậm...) không làm sập luồng chính
      this.logger.error(
        `[leave.status.changed] Gửi FCM thất bại cho userId=${payload.userId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string> {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
      },
      ...(data && { data }),
    };

    return admin.messaging().send(message);
  }
}
