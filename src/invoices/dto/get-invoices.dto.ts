import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PageOptionsDto } from '../../common/pagination';
import { InvoiceStatus } from '../../../generated/prisma/client';

// Kế thừa PageOptionsDto → tự động có sẵn `page`, `limit`, `skip`
// Chỉ cần khai báo thêm các trường lọc riêng của module Invoices
export class GetInvoicesDto extends PageOptionsDto {
  @ApiPropertyOptional({
    enum: InvoiceStatus,
    description: 'Lọc theo trạng thái',
    example: 'PENDING',
  })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;
}
