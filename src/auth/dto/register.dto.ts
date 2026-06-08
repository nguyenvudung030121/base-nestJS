import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Department, UserRole } from '../../../generated/prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'dev.le@company.com', description: 'Email của người dùng' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsString()
  @ApiProperty({ example: 'Company@2026', description: 'Mật khẩu tối thiểu 6 ký tự' })
  @MinLength(6)
  password!: string;

  @IsString()
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên không được để trống' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName!: string;


  @IsString()
  @ApiProperty({ example: 'IT', description: 'Department không được để trống (IT, HR, MARKETING, SALES) default: IT' })
  @IsNotEmpty({ message: 'Department không được để trống' })
  @IsEnum(Department, { message: 'Department không hợp lệ (IT, HR, MARKETING, SALES)' })
  department!: Department;

  // Thêm 1 field mới
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}