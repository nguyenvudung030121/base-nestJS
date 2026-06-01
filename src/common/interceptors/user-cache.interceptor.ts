import { CacheInterceptor, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: {
    sub?: number | string;
  };
};

@Injectable()
export class UserCacheInterceptor extends CacheInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) cacheManager: unknown,
    reflector: Reflector,
  ) {
    super(cacheManager, reflector);
  }

  protected trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.method !== 'GET') {
      return undefined;
    }

    const userId = request.user?.sub;
    if (!userId) {
      return undefined;
    }

    const requestUrl = request.originalUrl || request.url;
    return `user-cache:${request.method}:${requestUrl}:user:${userId}`;
  }
}
