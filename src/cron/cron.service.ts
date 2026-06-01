import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleOverdueInvoices() {
    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: { status: 'UNPAID' },
      select: { id: true },
    });

    if (unpaidInvoices.length === 0) {
      console.log('[CronJob] Đã quét và cập nhật 0 hóa đơn quá hạn!');
      return;
    }

    await this.prisma.invoice.updateMany({
      where: { id: { in: unpaidInvoices.map((invoice) => invoice.id) } },
      data: { status: 'OVERDUE' },
    });

    console.log(
      `[CronJob] Đã quét và cập nhật ${unpaidInvoices.length} hóa đơn quá hạn!`,
    );
  }
}
