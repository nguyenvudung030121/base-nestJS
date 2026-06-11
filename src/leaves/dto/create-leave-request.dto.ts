import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { LeaveType } from '../../../generated/prisma/client';

export class CreateLeaveRequestDto {
  @ApiProperty({
    enum: LeaveType,
    description: 'Loại nghỉ phép',
    example: LeaveType.ANNUAL,
  })
  @IsEnum(LeaveType, {
    message: `leaveType phải là một trong: ${Object.values(LeaveType).join(', ')}`,
  })
  leaveType: LeaveType;

  @ApiProperty({
    description: 'Ngày bắt đầu nghỉ (ISO 8601)',
    example: '2026-07-01',
  })
  @IsISO8601(
    {},
    { message: 'startDate phải là chuỗi ISO 8601 hợp lệ (vd: 2026-07-01)' },
  )
  startDate: string;

  @ApiProperty({
    description: 'Ngày kết thúc nghỉ (ISO 8601)',
    example: '2026-07-03',
  })
  @IsISO8601(
    {},
    { message: 'endDate phải là chuỗi ISO 8601 hợp lệ (vd: 2026-07-03)' },
  )
  endDate: string;

  @ApiProperty({
    description: 'Lý do xin nghỉ',
    example: 'Đi khám sức khỏe định kỳ',
  })
  @IsString()
  @IsNotEmpty({ message: 'reason không được để trống' })
  reason: string;

  @ApiPropertyOptional({
    description: 'URL file đính kèm minh chứng (nếu có)',
    example: 'https://storage.company.com/docs/medical-certificate.pdf',
  })
  @IsOptional()
  @IsUrl({}, { message: 'documentUrl phải là một URL hợp lệ' })
  documentUrl?: string;
}
