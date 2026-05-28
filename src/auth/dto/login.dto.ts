import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'testuser@example.com', description: 'Email đăng nhập' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'mypassword123', description: 'Mật khẩu đăng nhập' })
  @IsNotEmpty()
  password: string;
}