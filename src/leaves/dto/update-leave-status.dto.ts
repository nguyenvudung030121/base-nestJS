import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeaveStatus } from '../../../generated/prisma/client';

const ALLOWED = [LeaveStatus.APPROVED, LeaveStatus.REJECTED] as const;

export class UpdateLeaveStatusDto {
  @ApiProperty({
    enum: ALLOWED,
    description: 'Chỉ được truyền APPROVED hoặc REJECTED',
    example: LeaveStatus.APPROVED,
  })
  @IsEnum(ALLOWED, { message: 'status chỉ được là APPROVED hoặc REJECTED' })
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({
    description: 'Lý do từ chối (nếu REJECTED)',
    example: 'Nhân sự không đủ trong giai đoạn này',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
