import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TestPushDto {
  @ApiProperty({ example: '1', description: 'ID của user cần bắn thử push.' })
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'Thông báo test' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Firebase Cloud Messaging đã hoạt động.' })
  @IsString()
  @IsNotEmpty()
  body: string;
}
