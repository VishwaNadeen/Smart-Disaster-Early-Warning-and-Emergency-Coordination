import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  UsersService,
} from './users.service';

import {
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';

import {
  UpdateProfileDto,
} from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService:
      UsersService,
  ) {}

  @Get('me')
  getProfile(
    @Req() req: any,
  ) {
    return this.usersService.getProfile(
      req.user.id,
    );
  }

  @Put('me')
  updateProfile(
    @Req() req: any,

    @Body()
    dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(
      req.user.id,
      dto,
    );
  }

  @Delete('me')
  deleteAccount(
    @Req() req: any,
  ) {
    return this.usersService.deleteAccount(
      req.user.id,
    );
  }
}