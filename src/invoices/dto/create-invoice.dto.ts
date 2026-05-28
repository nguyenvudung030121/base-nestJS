import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({ example: 'Hóa đơn mua quạt', description: 'Tiêu đề của hóa đơn' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 3000, description: 'Số tiền hóa đơn' })
  @IsNumber()
  amount: number;
}