import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // 1. Kích hoạt Validation toàn cục (transform: true để @Type ép kiểu query params)
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // 2. Kích hoạt Global Exception Filter (Bắt lỗi)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 3. Kích hoạt Transform Interceptor (Bọc response thành công)
  app.useGlobalInterceptors(new TransformInterceptor());

  // 4. Cho phép truy cập thư mục 'uploads'
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // 5. Cấu hình Swagger (Tạo tài liệu API)
  const config = new DocumentBuilder()
    .setTitle('Invoice App API')
    .setDescription('Tài liệu giao tiếp API cho team Mobile (Flutter)')
    .setVersion('1.0')
    .addBearerAuth() // Nút hiển thị ổ khóa để đính kèm Token
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // 6. Khởi chạy Server
  await app.listen(configService.get<number>('PORT') || 3000);
}
bootstrap();
