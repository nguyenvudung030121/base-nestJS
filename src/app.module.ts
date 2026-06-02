import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvoicesModule } from './invoices/invoices.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CronModule } from './cron/cron.module';
import { StorageModule } from './storage/storage.module';
import { FirebaseModule } from './firebase/firebase.module';
import { UsersModule } from './users/users.module';

const nodeEnv = process.env.NODE_ENV;
const envFilePath =
  nodeEnv === 'staging'
    ? '.env.staging'
    : nodeEnv === 'production'
      ? '.env.production'
      : '.env.development';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true, ttl: 10000 }),
    ConfigModule.forRoot({ isGlobal: true, envFilePath }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    InvoicesModule,
    PrismaModule,
    AuthModule,
    CronModule,
    StorageModule,
    FirebaseModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
