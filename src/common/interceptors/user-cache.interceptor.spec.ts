import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserCacheInterceptor } from './user-cache.interceptor';

class TestUserCacheInterceptor extends UserCacheInterceptor {
  public getCacheKey(context: ExecutionContext) {
    return this.trackBy(context);
  }
}

describe('UserCacheInterceptor', () => {
  const createContext = (userId: number): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/invoices?page=1&limit=10',
          user: { sub: userId },
        }),
      }),
    }) as ExecutionContext;

  it('should include user id in cache key', () => {
    const interceptor = new TestUserCacheInterceptor({}, new Reflector());

    expect(interceptor.getCacheKey(createContext(1))).toBe(
      'user-cache:GET:/invoices?page=1&limit=10:user:1',
    );
    expect(interceptor.getCacheKey(createContext(2))).toBe(
      'user-cache:GET:/invoices?page=1&limit=10:user:2',
    );
  });
});
