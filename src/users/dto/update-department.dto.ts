import { Department } from '../../../generated/prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDepartmentDto {
@ApiProperty({ 
    enum: Object.values(Department), 
    description: 'Phòng ban của user. Các giá trị hợp lệ: IT, HR, MARKETING, SALES (Chỉ HR mới có quyền thay đổi này)', 
    example: Department.IT 
  })
  @IsEnum(Department)
  @IsNotEmpty()
  department!: Department;
}