import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserCacheInterceptor } from '../common/interceptors/user-cache.interceptor';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [AuthModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, UserCacheInterceptor],
})
export class InvoicesModule {}
