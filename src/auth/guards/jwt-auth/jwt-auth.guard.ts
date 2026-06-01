// src/auth/guards/jwt-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  // Tiêm JwtService vào để có đồ nghề kiểm tra Token
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. Lấy Token từ Header của Request
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException(
        'Bạn chưa đăng nhập (Không tìm thấy Token)!',
      );
    }

    try {
      // 2. Dùng JwtService để giải mã và xác minh Token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // 3. (QUAN TRỌNG) Gắn thông tin user vừa giải mã được vào lại Request
      // Để lát nữa Controller có thể biết "Ai đang gọi API này"
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn!');
    }

    return true; // Cho phép đi tiếp vào Controller
  }

  // Hàm phụ trợ: Tách chữ "Bearer " ra khỏi chuỗi Token
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
