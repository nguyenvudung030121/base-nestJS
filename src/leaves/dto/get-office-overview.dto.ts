import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PageOptionsDto } from '../../common/pagination';

export class GetOfficeOverviewDto extends PageOptionsDto {
  @ApiPropertyOptional({
    description:
      'Chế độ xem: week (tuần hiện tại) hoặc month (tháng hiện tại). Mặc định: month',
    example: 'month',
    enum: ['week', 'month'],
    default: 'month',
  })
  @IsIn(['week', 'month'])
  @IsOptional()
  readonly mode: 'week' | 'month' = 'month';
}
