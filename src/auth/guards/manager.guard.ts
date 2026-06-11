import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from 'generated/prisma/client';

@Injectable()
export class ManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== UserRole.MANAGER) {
      throw new ForbiddenException(
        'Chỉ tài khoản MANAGER mới có quyền thực hiện hành động này',
      );
    }
    return true;
  }
}
