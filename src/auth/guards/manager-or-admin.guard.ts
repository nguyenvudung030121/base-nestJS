import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from 'generated/prisma/client';

@Injectable()
export class ManagerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (
      !user ||
      (user.role !== UserRole.MANAGER && user.role !== UserRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Chỉ tài khoản MANAGER hoặc ADMIN mới có quyền thực hiện hành động này',
      );
    }
    return true;
  }
}
