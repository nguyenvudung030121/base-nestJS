import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'testuser@example.com', description: 'Email của người dùng' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'mypassword123', description: 'Mật khẩu tối thiểu 6 ký tự' })
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Tên của người dùng' })
  @IsNotEmpty()
  name: string;
}