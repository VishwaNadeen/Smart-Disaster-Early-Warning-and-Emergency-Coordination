import {
  Controller,
  Get,
} from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health() {
    return {
      success: true,

      message:
        'Smart Disaster Management Backend is running',
    };
  }
}