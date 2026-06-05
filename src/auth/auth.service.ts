// src/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from '../../generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Check email trùng
    const userExists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (userExists) throw new ConflictException('Email này đã tồn tại!');

    // 2. Băm mật khẩu
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Lưu xuống Database
    const newUser = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        email: dto.email,
        fullName: dto.fullName,
        password: hashedPassword,
        department: dto.department,
        role: UserRole.EMPLOYEE,
      },
    });

    // 4. AUTO-LOGIN: Tạo ngay JWT Token cho user vừa đăng ký
    return this.generateAuthResponse(newUser);
  }

  async login(dto: LoginDto) {
    // 1. Tìm user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Sai thông tin đăng nhập!');

    // 2. So sánh mật khẩu
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Sai thông tin đăng nhập!');

    // 3. Tạo Token và trả về
    return this.generateAuthResponse(user);
  }

  /**
   * Helper: Tạo JWT Token và trả về response chuẩn cho cả Register & Login.
   * Tập trung logic ở 1 chỗ để tránh lặp code.
   */
  private async generateAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    // Decode token to extract exact expiration timestamp
    const decoded = this.jwtService.decode<{ exp: number }>(accessToken);
    const tokenExpireTime = new Date(decoded.exp * 1000).toISOString();

    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      department: user.department,
      role: user.role,
      isActive: user.isActive,
      fcmToken: user.fcmToken,
      createdAt: user.createdAt,
    };

    return {
      accessToken,
      user: userWithoutPassword,
      tokenExpireTime,
    };
  }

  async logout(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Token không hợp lệ hoặc user không tồn tại!',
      );
    }

    // Tìm đúng User đang request và đặt fcmToken về null
    await this.prisma.user.update({
      where: { id: user.id },
      data: { fcmToken: null },
    });

    return { message: 'Đăng xuất thành công' };
  }
}
