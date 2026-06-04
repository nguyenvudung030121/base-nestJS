import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Department } from '../../../generated/prisma/client';

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

  @ApiPropertyOptional({ enum: Department, default: Department.IT, description: 'Phòng ban' })
  @IsEnum(Department)
  @IsOptional()
  department?: Department;
}