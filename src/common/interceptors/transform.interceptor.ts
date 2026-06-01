// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

// Interface định nghĩa cấu trúc response chuẩn cho Flutter BaseResponse
export interface StandardResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // Anti-Double-Wrapping: Nếu data đã có field 'success' thì trả thẳng
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Trích xuất message từ data nếu Service có truyền
        let message = 'Thành công';
        let responseData = data;

        if (data && typeof data === 'object' && 'message' in data) {
          message = data.message;
          // Loại bỏ field 'message' khỏi data để tránh trùng lặp
          const { message: _, ...rest } = data;
          responseData = rest;
        }

        // Phân trang: Nếu là PageDto (có items + meta) → đẩy meta lên ngang hàng với data
        if (responseData && typeof responseData === 'object' && 'items' in responseData && 'meta' in responseData) {
          return {
            success: true,
            statusCode: response.statusCode,
            message,
            data: responseData.items,
            meta: responseData.meta,
          };
        }

        return {
          success: true,
          statusCode: response.statusCode,
          message,
          data: responseData ?? null,
        };
      }),
    );
  }
}
