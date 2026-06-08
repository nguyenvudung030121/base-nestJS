import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'dev.le@company.com', description: 'Email đăng nhập' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Company@2026', description: 'Mật khẩu đăng nhập' })
  @IsNotEmpty()
  password: string;
}