import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // Mở kết nối tới Database ngay khi Server vừa khởi động xong
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
