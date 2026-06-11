// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Gắn cờ Global
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Bắt buộc phải export để các Module khác (như Invoices) xài được
})
export class PrismaModule {}
