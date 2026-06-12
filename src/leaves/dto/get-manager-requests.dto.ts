import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { Department, LeaveStatus } from '../../../generated/prisma/client';
import { PageOptionsDto } from '../../common/pagination';

export class GetManagerRequestsDto extends PageOptionsDto {
  @ApiPropertyOptional({
    description:
      'Lọc theo trạng thái đơn. Nếu để trống sẽ trả về đơn ở tất cả trạng thái',
    enum: LeaveStatus,
  })
  @IsEnum(LeaveStatus)
  @IsOptional()
  readonly status?: LeaveStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo phòng ban của nhân viên nộp đơn',
    enum: Department,
  })
  @IsEnum(Department)
  @IsOptional()
  readonly department?: Department;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu khoảng lọc (ISO date). Mặc định: ngày hiện tại',
    example: '2026-06-10',
  })
  @IsDateString()
  @IsOptional()
  readonly startDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc khoảng lọc (ISO date). Mặc định: ngày hiện tại',
    example: '2026-06-10',
  })
  @IsDateString()
  @IsOptional()
  readonly endDate?: string;
}
