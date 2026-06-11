import { UserRole } from '../../../generated/prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({
    enum: Object.values(UserRole),
    description:
      'Quyền hạn của user. Các giá trị hợp lệ: ADMIN, MANAGER, EMPLOYEE (Chỉ ADMIN mới có quyền thay đổi này)',
    example: UserRole.EMPLOYEE,
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;
}
