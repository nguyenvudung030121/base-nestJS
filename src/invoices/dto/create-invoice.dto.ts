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

  @ApiPropertyOptional({
    description: 'Public URL ảnh hóa đơn (lấy từ API upload)',
    example:
      'https://example.supabase.co/storage/v1/object/public/receipts/1780026811089-63681019.png',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
