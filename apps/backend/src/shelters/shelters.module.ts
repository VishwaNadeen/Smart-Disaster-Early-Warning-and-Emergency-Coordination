
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Shelter,
  ShelterSchema,
} from './schemas/shelter.schema';

import {
  User,
  UserSchema,
} from '../users/schemas/user.schema';

import { SheltersService } from './shelters.service';
import { ShelterStaffService } from './shelter-staff.service';
import { SheltersController } from './shelters.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Shelter.name,
        schema: ShelterSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [SheltersController],
  providers: [
    SheltersService,
    ShelterStaffService,
  ],
  exports: [
    SheltersService,
    ShelterStaffService,
  ],
})
export class SheltersModule {}
