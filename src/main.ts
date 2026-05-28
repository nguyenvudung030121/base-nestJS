import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Kích hoạt Validation toàn cục (Rất quan trọng để các DTO hoạt động)
  app.useGlobalPipes(new ValidationPipe());

  // 2. Cấu hình Swagger (Tạo tài liệu API)
  const config = new DocumentBuilder()
    .setTitle('Invoice App API')
    .setDescription('Tài liệu giao tiếp API cho team Mobile (Flutter)')
    .setVersion('1.0')
    .addBearerAuth() // Nút hiển thị ổ khóa để đính kèm Token
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // 3. Khởi chạy Server với cấu hình PORT của riêng bạn
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();