import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from 'generated/prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Token user đã login

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Chỉ tài khoản ADMIN mới có quyền thực hiện hành động này',
      );
    }
    return true;
  }
}
