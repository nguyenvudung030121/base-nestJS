// src/invoices/dto/get-invoices.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PageOptionsDto } from '../../common/pagination';

// Kế thừa PageOptionsDto → tự động có sẵn `page`, `limit`, `skip`
// Chỉ cần khai báo thêm các trường lọc riêng của module Invoices
export class GetInvoicesDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Lọc theo trạng thái', example: 'UNPAID' })
  @IsString()
  @IsOptional()
  status?: string;
}