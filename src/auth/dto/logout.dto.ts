import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    example: 'cuid_abc123',
    description: 'ID của user cần đăng xuất',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
