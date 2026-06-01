// src/auth/auth.service.ts
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Check email trùng
    const userExists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (userExists) throw new ConflictException('Email này đã tồn tại!');

    // 2. Băm mật khẩu
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Lưu xuống Database
    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
      },
    });

    // 4. AUTO-LOGIN: Tạo ngay JWT Token cho user vừa đăng ký
    return this.generateAuthResponse(newUser);
  }

  async login(dto: LoginDto) {
    // 1. Tìm user
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
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
  private async generateAuthResponse(user: { id: number; name: string; email: string }) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);
    return { id: user.id, name: user.name, accessToken };
  }
}