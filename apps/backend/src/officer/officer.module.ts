import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OfficerController } from './officer.controller';
import { OfficerService } from './officer.service';
import { User, UserSchema } from '../users/schemas/user.schema'; // update to your actual existing schema path
import { DistrictChangeRequest, DistrictChangeRequestSchema } from './schemas/district-change-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DistrictChangeRequest.name, schema: DistrictChangeRequestSchema },
    ]),
  ],
  controllers: [OfficerController],
  providers: [OfficerService],
})
export class OfficerModule {}
