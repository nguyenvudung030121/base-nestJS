import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserCacheInterceptor } from '../common/interceptors/user-cache.interceptor';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

describe('InvoicesController', () => {
  let controller: InvoicesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      controllers: [InvoicesController],
      providers: [
        { provide: InvoicesService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        UserCacheInterceptor,
      ],
    }).compile();

    controller = module.get<InvoicesController>(InvoicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
