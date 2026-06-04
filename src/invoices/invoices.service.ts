// src/invoices/invoices.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GetInvoicesDto } from './dto/get-invoices.dto';
import { PageDto, PageMetaDto } from '../common/pagination';
import { Prisma } from '../../generated/prisma/client';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  // Dependency Injection: Tiêm cầu nối DB vào đây
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // POST: Tạo hóa đơn mới
  async create(dto: CreateInvoiceDto, userId: string) {
    const newInvoice = await this.prisma.invoice.create({
      data: {
        amount: dto.amount,
        userId: userId, // Nối với User lấy từ token
      },
    });

    await this.sendNewInvoiceNotification(userId, newInvoice.id);
    await this.clearCache();

    return newInvoice;
  }

  // GET: Lấy hóa đơn có phân trang + lọc
  async findAll(dto: GetInvoicesDto, userId: string) {
    // 1. Xây dựng điều kiện lọc
    const whereCondition: Prisma.InvoiceWhereInput = {
      userId, // Chỉ lấy hóa đơn của user hiện tại
      ...(dto.status && { status: dto.status }), // Lọc theo status nếu có
    };

    // 2. Gọi đồng thời findMany + count bằng Promise.all (tối ưu performance)
    const [items, itemCount] = await Promise.all([
      this.prisma.invoice.findMany({
        where: whereCondition,
        skip: dto.skip,
        take: dto.limit,
        orderBy: { createdAt: 'desc' }, // Mới nhất lên đầu
        include: { user: true }, // Lấy kèm luôn thông tin User
      }),
      this.prisma.invoice.count({
        where: whereCondition,
      }),
    ]);

    // 3. Tính toán meta pagination và trả về
    const meta = new PageMetaDto({ pageOptionsDto: dto, itemCount });
    return new PageDto(items, meta);
  }

  private async clearCache() {
    const cacheManager = this.cacheManager as Cache & {
      reset?: () => Promise<void>;
    };

    if (cacheManager.reset) {
      await cacheManager.reset();
      return;
    }

    await cacheManager.clear();
  }

  private async sendNewInvoiceNotification(
    userId: string,
    invoiceId: number,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) {
      return;
    }

    try {
      await this.firebaseService.sendPushNotification(
        user.fcmToken,
        '🧾 Có hóa đơn mới!',
        `Bạn vừa nhận được hóa đơn mới với mã #${invoiceId}. Vui lòng kiểm tra và thanh toán.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send new invoice push notification for invoice #${invoiceId}.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
