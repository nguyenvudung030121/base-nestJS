import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @ApiProperty({ example: 'Hóa đơn tiền điện' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 550000 })
  @IsNumber()
  amount: number;

  // THÊM ĐOẠN NÀY
  @ApiPropertyOptional({ 
    description: 'Đường dẫn ảnh hóa đơn (lấy từ API upload)',
    example: '/uploads/1780026811089-63681019.png' 
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}