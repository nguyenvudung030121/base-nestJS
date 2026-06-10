import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { ManagerOrAdminGuard } from '../auth/guards/manager-or-admin.guard';
import { SupabaseService } from '../storage/supabase.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { GetManagerRequestsDto } from './dto/get-manager-requests.dto';
import { GetMyRequestsDto } from './dto/get-my-requests.dto';
import { GetOfficeOverviewDto } from './dto/get-office-overview.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { LeavesService } from './leaves.service';

@ApiTags('Leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaves')
export class LeavesController {
  constructor(
    private readonly leavesService: LeavesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ----------------------------------------------------------------
  // POST /leaves — Tạo đơn xin nghỉ
  // ----------------------------------------------------------------
  @Post()
  @ApiOperation({ summary: 'Nhân viên tạo đơn xin nghỉ phép' })
  create(@Body() dto: CreateLeaveRequestDto, @Req() req: Request) {
    const userId = req['user'].sub as string;
    return this.leavesService.createRequest(userId, dto);
  }

  // ----------------------------------------------------------------
  // GET /leaves/balance — Xem quỹ phép của bản thân
  // ----------------------------------------------------------------
  @Get('balance')
  @ApiOperation({ summary: 'Xem quỹ phép năm hiện tại của bản thân' })
  getBalance(@Req() req: Request) {
    const userId = req['user'].sub as string;
    return this.leavesService.getBalance(userId);
  }

  // ----------------------------------------------------------------
  // GET /leaves/my-requests — Lịch sử đơn của bản thân
  // ----------------------------------------------------------------
  @Get('my-requests')
  @ApiOperation({ summary: 'Lịch sử đơn xin nghỉ của bản thân' })
  getMyRequests(@Query() dto: GetMyRequestsDto, @Req() req: Request) {
    const userId = req['user'].sub as string;
    return this.leavesService.getMyRequests(userId, dto);
  }

  // ----------------------------------------------------------------
  // GET /leaves/office-overview — Lịch nghỉ toàn công ty
  // ----------------------------------------------------------------
  @Get('office-overview')
  @ApiOperation({ summary: 'Lịch nghỉ toàn công ty theo tuần hoặc tháng' })
  getOfficeOverview(@Query() dto: GetOfficeOverviewDto) {
    return this.leavesService.getOfficeOverview(dto);
  }

  // ----------------------------------------------------------------
  // GET /leaves/manager/requests — [Manager/Admin] Danh sách đơn xin nghỉ
  // ----------------------------------------------------------------
  @Get('manager/requests')
  @UseGuards(ManagerOrAdminGuard)
  @ApiOperation({
    summary: '[Manager/Admin] Danh sách đơn xin nghỉ của nhân viên (lọc theo trạng thái, phòng ban, khoảng ngày)',
  })
  getManagerRequests(@Query() dto: GetManagerRequestsDto) {
    return this.leavesService.getManagerRequests(dto);
  }

  // ----------------------------------------------------------------
  // PATCH /leaves/:id/cancel — Hủy đơn (bởi chính nhân viên)
  // ----------------------------------------------------------------
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Nhân viên hủy đơn xin nghỉ của chính mình' })
  cancelRequest(@Param('id') id: string, @Req() req: Request) {
    const userId = req['user'].sub as string;
    return this.leavesService.cancelRequest(id, userId);
  }

  // ----------------------------------------------------------------
  // PATCH /leaves/:id/status — Duyệt / Từ chối đơn (Manager hoặc Admin)
  // ----------------------------------------------------------------
  @Patch(':id/status')
  @UseGuards(ManagerOrAdminGuard)
  @ApiOperation({ summary: '[Manager/Admin] Duyệt hoặc từ chối đơn xin nghỉ' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveStatusDto,
    @Req() req: Request,
  ) {
    const approverId = req['user'].sub as string;
    return this.leavesService.updateStatus(id, approverId, dto);
  }

  // ----------------------------------------------------------------
  // POST /leaves/upload-document — Upload file minh chứng
  // ----------------------------------------------------------------
  @Post('upload-document')
  @ApiOperation({ summary: 'Upload file minh chứng nghỉ phép (PDF, JPG, PNG)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn một file');
    }
    const documentUrl = await this.supabaseService.uploadLeaveDocument(file);
    return { documentUrl };
  }
}
