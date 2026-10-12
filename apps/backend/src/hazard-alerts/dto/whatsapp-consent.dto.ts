
import { IsBoolean } from 'class-validator';

export class WhatsappConsentDto {
  @IsBoolean()
  optIn!: boolean;
}
