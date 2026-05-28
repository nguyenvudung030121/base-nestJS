import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard'; // Import Guard

@ApiTags('Invoices')
@ApiBearerAuth() // Đánh dấu API này yêu cầu Token trong Swagger UI
@UseGuards(JwtAuthGuard) // Bật chốt chặn bảo vệ TOÀN BỘ API trong file này
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  async create(
    @Body() dto: CreateInvoiceDto, 
    @Req() request: Request // Lấy toàn bộ Request object
  ) {
    // Lấy ID của user từ Token (do Guard đã nhét vào ở Bước 2)
    // 'sub' chính là user.id mà ta đã định nghĩa lúc sinh Token
    const userId = request['user'].sub; 
    
    // Ép Service dùng userId thật từ Token, không dùng data client gửi
    return this.invoicesService.create(dto, userId); 
  }

  @Get()
  async findAll() {
    return this.invoicesService.findAll();
  }
}