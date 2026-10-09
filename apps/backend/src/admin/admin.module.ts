import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EmailService } from '../common/email.service';
import { DistrictChangeRequest, DistrictChangeRequestSchema } from '../officer/schemas/district-change-request.schema';
// IMPORTANT: update this import to your actual existing User schema path/export.
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DistrictChangeRequest.name, schema: DistrictChangeRequestSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, EmailService],
})
export class AdminModule {}
