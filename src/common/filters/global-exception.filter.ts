// src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch() // Để trống @Catch() nghĩa là "Bắt TẤT CẢ mọi loại lỗi"
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 1. Xác định mã lỗi (HTTP Status Code)
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 2. Xác định câu thông báo lỗi (Message)
    let message = 'Lỗi hệ thống nội bộ (Internal Server Error)';
    let validationErrors: string[] | undefined;

    if (exception instanceof HttpException) {
      const responseBody = exception.getResponse();

      if (
        typeof responseBody === 'object' &&
        responseBody.hasOwnProperty('message')
      ) {
        const msg = (responseBody as any).message;

        if (Array.isArray(msg)) {
          // class-validator trả về mảng lỗi → lấy lỗi đầu tiên cho UI
          message = msg[0];
          validationErrors = msg; // Giữ lại toàn bộ mảng trong errorDetails
        } else {
          message = msg;
        }
      } else if (typeof responseBody === 'string') {
        message = responseBody;
      }
    } else if (exception instanceof Error) {
      // Bắt các lỗi văng ra do code sai logic (không phải HttpException)
      message = exception.message;
    }

    // 3. Chuẩn hóa định dạng JSON trả về cho Mobile (Flutter BaseResponse)
    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      data: null,
      errorDetails: {
        path: request.url,
        timestamp: new Date().toISOString(),
        ...(validationErrors && { errors: validationErrors }),
      },
    });
  }
}