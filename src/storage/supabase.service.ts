import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { extname } from 'path';

@Injectable()
export class SupabaseService {
  private readonly client?: SupabaseClient;
  private readonly bucketName = 'receipts';

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    const legacyKey = this.configService.get<string>('SUPABASE_KEY');
    const supabaseKey =
      serviceRoleKey ??
      (legacyKey && !legacyKey.startsWith('sb_publishable_')
        ? legacyKey
        : undefined);

    if (supabaseUrl && supabaseKey) {
      this.client = createClient(supabaseUrl, supabaseKey);
    }
  }

  async uploadReceipt(file: Express.Multer.File): Promise<string> {
    const extension = extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    const { error } = await this.getClient()
      .storage.from(this.bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Upload receipt failed: ${error.message}`,
      );
    }

    const { data } = this.getClient()
      .storage.from(this.bucketName)
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async uploadLeaveDocument(file: Express.Multer.File): Promise<string> {
    const ALLOWED_MIMETYPES = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận file PDF, JPG hoặc PNG');
    }

    const extension = extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    const { error } = await this.getClient()
      .storage.from('leave-document')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Upload leave document failed: ${error.message}`,
      );
    }

    const { data } = this.getClient()
      .storage.from('leave-document')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Supabase Storage.',
      );
    }

    return this.client;
  }
}
