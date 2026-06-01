import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer'; // Để lưu ảnh
import { extname } from 'path'; // Để lấy đuôi file
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GetInvoicesDto } from './dto/get-invoices.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard'; // Import Guard
import { UserCacheInterceptor } from '../common/interceptors/user-cache.interceptor';

@ApiTags('Invoices')
@ApiBearerAuth() // Đánh dấu API này yêu cầu Token trong Swagger UI
@UseGuards(JwtAuthGuard) // Bật chốt chặn bảo vệ TOÀN BỘ API trong file này
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  async create(
    @Body() dto: CreateInvoiceDto,
    @Req() request: Request, // Lấy toàn bộ Request object
  ) {
    // Lấy ID của user từ Token (do Guard đã nhét vào ở Bước 2)
    // 'sub' chính là user.id mà ta đã định nghĩa lúc sinh Token
    const userId = request['user'].sub;

    // Ép Service dùng userId thật từ Token, không dùng data client gửi
    return this.invoicesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn có phân trang' })
  @UseInterceptors(UserCacheInterceptor)
  async findAll(@Query() dto: GetInvoicesDto, @Req() request: Request) {
    const userId = request['user'].sub;
    return this.invoicesService.findAll(dto, userId);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload ảnh hóa đơn' })
  @ApiConsumes('multipart/form-data') // Báo cho Swagger biết API này nhận File
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary', // Hiển thị nút chọn file trên Swagger
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads', // Thư mục lưu file
        filename: (req, file, cb) => {
          // Tạo tên file ngẫu nhiên để không bị trùng (ví dụ: 1691234567-3453.jpg)
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  uploadInvoiceImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn một file ảnh!');
    }

    // Trả về đường dẫn của file vừa lưu — Interceptor sẽ tự bọc
    return { imageUrl: file.path };
  }
}
