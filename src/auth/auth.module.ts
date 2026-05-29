// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: 'CHIA_KHOA_BIMAT_CUA_BAN', // Thực tế nên để ở file .env
      signOptions: { expiresIn: '3h' },  // Token sống được 1 tiếng
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}