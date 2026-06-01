// src/invoices/invoices.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GetInvoicesDto } from './dto/get-invoices.dto';
import { PageDto, PageMetaDto } from '../common/pagination';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class InvoicesService {
  // Dependency Injection: Tiêm cầu nối DB vào đây
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // POST: Tạo hóa đơn mới
  async create(dto: CreateInvoiceDto, userId: number) {
    const newInvoice = await this.prisma.invoice.create({
      data: {
        title: dto.title,
        amount: dto.amount,
        imageUrl: dto.imageUrl,
        userId: userId, // Nối với User lấy từ token
      },
    });

    await this.clearCache();

    return newInvoice;
  }

  // GET: Lấy hóa đơn có phân trang + lọc
  async findAll(dto: GetInvoicesDto, userId: number) {
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
}
