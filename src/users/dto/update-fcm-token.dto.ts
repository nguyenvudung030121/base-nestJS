import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateFcmTokenDto {
  @ApiProperty({
    example: 'fY3x...device-fcm-token',
    description: 'FCM token hiện tại của thiết bị Flutter.',
  })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
