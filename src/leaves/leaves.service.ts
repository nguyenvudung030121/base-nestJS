import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveStatus, LeaveType, Prisma, UserRole } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { GetManagerRequestsDto } from './dto/get-manager-requests.dto';
import { GetMyRequestsDto } from './dto/get-my-requests.dto';
import { GetOfficeOverviewDto } from './dto/get-office-overview.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { PageDto, PageMetaDto } from '../common/pagination';

@Injectable()
export class LeavesService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------------
  // 1. TẠO ĐƠN XIN NGHỈ
  // ----------------------------------------------------------------

  async createRequest(userId: string, dto: CreateLeaveRequestDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    this.validateDates(start, end);

    const totalDays = this.calculateWorkingDays(start, end);

    // Transaction: kiểm tra quỹ phép + trừ tạm (giữ chỗ) ngay khi tạo đơn (PENDING)
    return this.prisma.$transaction(async (tx) => {
      await this.holdLeaveBalance(
        tx,
        userId,
        dto.leaveType,
        start.getFullYear(),
        totalDays,
      );

      return tx.leaveRequest.create({
        data: {
          userId,
          leaveType: dto.leaveType,
          startDate: start,
          endDate: end,
          totalDays,
          reason: dto.reason,
          documentUrl: dto.documentUrl ?? null,
          status: LeaveStatus.PENDING,
        },
      });
    });
  }

  // ----------------------------------------------------------------
  // 2. XEM QUỸ PHÉP
  // ----------------------------------------------------------------

  async getBalance(userId: string) {
    const year = new Date().getFullYear();
    const balances = await this.prisma.leaveBalance.findMany({
      where: { userId, year },
    });

    return balances.map((b) => ({
      leaveType: b.leaveType,
      allocated: b.allocated,
      used: b.used,
      remaining: parseFloat((b.allocated - b.used).toFixed(1)),
    }));
  }

  // ----------------------------------------------------------------
  // 3. LỊCH SỬ ĐƠN CỦA BẢN THÂN
  // ----------------------------------------------------------------

  async getMyRequests(userId: string, dto: GetMyRequestsDto) {
    const whereCondition = { userId };

    const [items, itemCount] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: whereCondition,
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leaveRequest.count({
        where: whereCondition,
      }),
    ]);

    const meta = new PageMetaDto({ pageOptionsDto: dto, itemCount });
    return new PageDto(items, meta);
  }

  // ----------------------------------------------------------------
  // 4. LỊCH TOÀN CÔNG TY (mode: week | month)
  // ----------------------------------------------------------------

  async getOfficeOverview(dto: GetOfficeOverviewDto) {
    const now = new Date();
    let rangeStart: Date;
    let rangeEnd: Date;

    if (dto.mode === 'month') {
      // Đầu tháng → cuối tháng
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      rangeEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    } else {
      // Đầu tuần (Thứ 2) → cuối tuần (CN)
      const day = now.getDay(); // 0=CN, 1=T2...
      const diff = day === 0 ? -6 : 1 - day;
      rangeStart = new Date(now);
      rangeStart.setDate(now.getDate() + diff);
      rangeStart.setHours(0, 0, 0, 0);

      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeStart.getDate() + 6);
      rangeEnd.setHours(23, 59, 59, 999);
    }

    const whereCondition = {
      status: { in: [LeaveStatus.APPROVED, LeaveStatus.PENDING] },
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
    };

    const [items, itemCount] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: whereCondition,
        skip: dto.skip,
        take: dto.limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              department: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
      }),
      this.prisma.leaveRequest.count({
        where: whereCondition,
      }),
    ]);

    const meta = new PageMetaDto({ pageOptionsDto: dto, itemCount });
    return new PageDto(items, meta);
  }

  // ----------------------------------------------------------------
  // 4.5. DANH SÁCH ĐƠN XIN NGHỈ (dành cho Manager/Admin)
  // ----------------------------------------------------------------

  async getManagerRequests(dto: GetManagerRequestsDto) {
    let rangeStart: Date;
    let rangeEnd: Date;

    if (dto.startDate) {
      rangeStart = new Date(dto.startDate);
      rangeStart.setHours(0, 0, 0, 0);
    } else {
      rangeStart = new Date();
      rangeStart.setHours(0, 0, 0, 0);
    }

    if (dto.endDate) {
      rangeEnd = new Date(dto.endDate);
    } else {
      rangeEnd = new Date(rangeStart);
    }
    rangeEnd.setHours(23, 59, 59, 999);

    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      throw new BadRequestException('startDate hoặc endDate không hợp lệ');
    }

    if (rangeEnd < rangeStart) {
      throw new BadRequestException('endDate phải lớn hơn hoặc bằng startDate');
    }

    const whereCondition = {
      status: dto.status,
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
      ...(dto.department && {
        user: { department: dto.department },
      }),
    };

    const [items, itemCount] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: whereCondition,
        skip: dto.skip,
        take: dto.limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              department: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leaveRequest.count({
        where: whereCondition,
      }),
    ]);

    const meta = new PageMetaDto({ pageOptionsDto: dto, itemCount });
    return new PageDto(items, meta);
  }

  // ----------------------------------------------------------------
  // 5. HỦY ĐƠN (bởi chính nhân viên)
  // ----------------------------------------------------------------

  async cancelRequest(requestId: string, userId: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy đơn xin nghỉ');
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!requester) {
      throw new ForbiddenException('Người dùng không hợp lệ');
    }

    const isOwner = request.userId === userId;
    const isAdmin = requester.role === UserRole.ADMIN;
    const isManagerInSameDept =
      requester.role === UserRole.MANAGER &&
      request.user?.department === requester.department;

    if (!isOwner && !isAdmin && !isManagerInSameDept) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn này');
    }

    if (
      request.status !== LeaveStatus.PENDING &&
      request.status !== LeaveStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Chỉ có thể hủy đơn đang ở trạng thái PENDING hoặc APPROVED',
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDay = new Date(request.startDate);
    startDay.setHours(0, 0, 0, 0);

    if (request.status === LeaveStatus.APPROVED && startDay <= today) {
      throw new BadRequestException(
        'Không thể hủy đơn đã bắt đầu hoặc đã diễn ra',
      );
    }

    // Transaction: hủy đơn + hoàn trả quỹ phép đã giữ chỗ (PENDING hoặc APPROVED đều đã trừ quỹ)
    return this.prisma.$transaction(async (tx) => {
      await this.releaseLeaveBalance(
        tx,
        request.userId,
        request.leaveType,
        request.startDate.getFullYear(),
        request.totalDays,
      );

      return tx.leaveRequest.update({
        where: { id: requestId },
        data: { status: LeaveStatus.CANCELLED },
      });
    });
  }

  // ----------------------------------------------------------------
  // 6. DUYỆT / TỪ CHỐI ĐƠN (bởi Manager/Admin)
  // ----------------------------------------------------------------

  async updateStatus(
    requestId: string,
    approverId: string,
    dto: UpdateLeaveStatusDto,
  ) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy đơn xin nghỉ');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Đơn này đã được xử lý (trạng thái hiện tại: ${request.status})`,
      );
    }

    // Quỹ phép đã được trừ (giữ chỗ) ngay khi tạo đơn (PENDING).
    // - APPROVED: giữ nguyên phần đã trừ, không cần thao tác thêm.
    // - REJECTED: hoàn trả lại số ngày đã giữ chỗ.
    return this.prisma.$transaction(async (tx) => {
      if (dto.status === LeaveStatus.REJECTED) {
        await this.releaseLeaveBalance(
          tx,
          request.userId,
          request.leaveType,
          request.startDate.getFullYear(),
          request.totalDays,
        );
      }

      return tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: dto.status,
          approvedById: approverId,
        },
      });
    });
  }

  // ----------------------------------------------------------------
  // PRIVATE HELPERS
  // ----------------------------------------------------------------

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) count++;
      cursor.setDate(cursor.getDate() + 1);
    }

    if (count === 0) {
      throw new BadRequestException(
        'Khoảng thời gian đăng ký chỉ chứa ngày cuối tuần',
      );
    }

    return count;
  }

  private validateDates(start: Date, end: Date): void {
    if (isNaN(start.getTime())) {
      throw new BadRequestException('startDate không hợp lệ');
    }
    if (isNaN(end.getTime())) {
      throw new BadRequestException('endDate không hợp lệ');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);

    if (startDay < today) {
      throw new BadRequestException('startDate phải từ hôm nay trở đi');
    }

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    if (endDay < startDay) {
      throw new BadRequestException('endDate phải lớn hơn hoặc bằng startDate');
    }
  }

  /**
   * Kiểm tra quỹ phép còn đủ không, nếu đủ thì TRỪ NGAY (giữ chỗ) `used += totalDays`.
   * Áp dụng khi tạo đơn (status PENDING) để tránh trường hợp nhân viên apply
   * vượt quá số ngày phép thực có do đơn PENDING chưa bị trừ quỹ.
   */
  private async holdLeaveBalance(
    tx: Prisma.TransactionClient,
    userId: string,
    leaveType: LeaveType,
    year: number,
    totalDays: number,
  ): Promise<void> {
    const balance = await tx.leaveBalance.findUnique({
      where: {
        userId_leaveType_year: { userId, leaveType, year },
      },
    });

    if (!balance) {
      throw new NotFoundException(
        'Không tìm thấy quỹ phép của bạn cho năm tương ứng',
      );
    }

    const available = balance.allocated - balance.used;

    if (available < totalDays) {
      if (leaveType === LeaveType.ANNUAL) {
        throw new BadRequestException(
          `Số ngày phép năm tích lũy hiện tại không đủ. Bạn chỉ có ${available} ngày khả dụng.`,
        );
      } else {
        throw new BadRequestException(
          `Số ngày phép không đủ. Bạn chỉ có ${available} ngày khả dụng cho loại phép này.`,
        );
      }
    }

    await tx.leaveBalance.update({
      where: {
        userId_leaveType_year: { userId, leaveType, year },
      },
      data: { used: { increment: totalDays } },
    });
  }

  /**
   * Hoàn trả quỹ phép đã giữ chỗ khi đơn bị REJECTED hoặc CANCELLED.
   */
  private async releaseLeaveBalance(
    tx: Prisma.TransactionClient,
    userId: string,
    leaveType: LeaveType,
    year: number,
    totalDays: number,
  ): Promise<void> {
    await tx.leaveBalance.updateMany({
      where: { userId, leaveType, year },
      data: { used: { decrement: totalDays } },
    });
  }
}
