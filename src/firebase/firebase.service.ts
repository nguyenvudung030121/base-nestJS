import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

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

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
  ): Promise<string> {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
      },
    };

    return admin.messaging().send(message);
  }
}
