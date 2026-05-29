import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  // Dependency Injection: Tiêm cầu nối DB vào đây
  constructor(private readonly prisma: PrismaService) {}

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
    return newInvoice;
  }

  // GET: Lấy toàn bộ hóa đơn
  async findAll() {
    const invoices = await this.prisma.invoice.findMany({
      include: { user: true } // Lấy kèm luôn thông tin của User sở hữu hóa đơn này
    });
    return invoices;
  }
}