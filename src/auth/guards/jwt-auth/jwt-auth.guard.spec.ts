import { JwtAuthGuard } from './jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

describe('JwtAuthGuard', () => {
  it('should be defined', () => {
    expect(
      new JwtAuthGuard({} as JwtService, {} as ConfigService),
    ).toBeDefined();
  });
});
