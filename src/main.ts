import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 1. Kích hoạt Validation toàn cục (transform: true để @Type ép kiểu query params)
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // 2. Kích hoạt Global Exception Filter (Bắt lỗi)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 3. Kích hoạt Transform Interceptor (Bọc response thành công)
  app.useGlobalInterceptors(new TransformInterceptor());

  // 4. Cấu hình Swagger (Tạo tài liệu API)
  const config = new DocumentBuilder()
    .setTitle('Invoice App API')
    .setDescription('Tài liệu giao tiếp API cho team Mobile (Flutter)')
    .setVersion('1.0')
    .addBearerAuth() // Nút hiển thị ổ khóa để đính kèm Token
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Giữ Authorize token sau khi refresh trang
    },
  });

  // 5. Khởi chạy Server
  const port = process.env.PORT || configService.get('PORT') || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(
    `[Bootstrap] Server is listening on port ${port} in "${process.env.NODE_ENV || 'development'}" mode`,
  );
}
bootstrap();
