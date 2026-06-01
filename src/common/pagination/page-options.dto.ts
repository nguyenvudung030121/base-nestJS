// src/common/pagination/page-options.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PageOptionsDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng item trên 1 trang', example: 10, minimum: 1, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly limit: number = 10;

  /**
   * Tính số bản ghi cần bỏ qua (dùng cho Prisma `skip`).
   * Ví dụ: page=2, limit=10 → skip=10
   */
  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
