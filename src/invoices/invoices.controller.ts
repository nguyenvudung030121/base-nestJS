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
import { memoryStorage } from 'multer';
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
import { SupabaseService } from '../storage/supabase.service';

@ApiTags('Invoices')
@ApiBearerAuth() // Đánh dấu API này yêu cầu Token trong Swagger UI
@UseGuards(JwtAuthGuard) // Bật chốt chặn bảo vệ TOÀN BỘ API trong file này
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly supabaseService: SupabaseService,
  ) {}

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
      storage: memoryStorage(),
    }),
  )
  async uploadInvoiceImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn một file ảnh!');
    }

    const imageUrl = await this.supabaseService.uploadReceipt(file);

    return { imageUrl };
  }
}
