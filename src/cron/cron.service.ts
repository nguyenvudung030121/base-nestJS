import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaveStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleOverdueInvoices() {
    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: { status: 'PENDING' },
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

  // ----------------------------------------------------------------
  // Tự động duyệt đơn xin nghỉ PENDING quá 1 ngày mà Manager/Admin
  // chưa xử lý (quỹ phép đã được giữ chỗ từ lúc tạo đơn nên không cần
  // trừ thêm — chỉ cần chuyển trạng thái sang APPROVED).
  // ----------------------------------------------------------------
  @Cron(CronExpression.EVERY_HOUR)
  async autoApproveStaleLeaveRequests() {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const staleRequests = await this.prisma.leaveRequest.findMany({
      where: {
        status: LeaveStatus.PENDING,
        createdAt: { lte: oneDayAgo },
      },
      select: { id: true },
    });

    if (staleRequests.length === 0) {
      console.log('[CronJob] Đã quét và tự động duyệt 0 đơn xin nghỉ quá hạn!');
      return;
    }

    await this.prisma.leaveRequest.updateMany({
      where: { id: { in: staleRequests.map((r) => r.id) } },
      data: { status: LeaveStatus.APPROVED },
    });

    console.log(
      `[CronJob] Đã quét và tự động duyệt ${staleRequests.length} đơn xin nghỉ quá hạn!`,
    );
  }
}
