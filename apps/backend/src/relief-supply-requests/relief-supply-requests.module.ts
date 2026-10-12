
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  ReliefSupplyRequest,
  ReliefSupplyRequestSchema,
} from './schemas/relief-supply-request.schema';

import {
  Shelter,
  ShelterSchema,
} from '../shelters/schemas/shelter.schema';

import {
  User,
  UserSchema,
} from '../users/schemas/user.schema';

import {
  ReliefSupply,
  ReliefSupplySchema,
} from '../relief-supplies/schemas/relief-supply.schema';

import { ReliefSupplyRequestsController } from './relief-supply-requests.controller';
import { ReliefSupplyRequestsService } from './relief-supply-requests.service';
import { ReliefSuppliesModule } from '../relief-supplies/relief-supplies.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ReliefSupplyRequest.name,
        schema: ReliefSupplyRequestSchema,
      },
      {
        name: Shelter.name,
        schema: ShelterSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: ReliefSupply.name,
        schema: ReliefSupplySchema,
      },
    ]),
    ReliefSuppliesModule,
  ],

  controllers: [ReliefSupplyRequestsController],

  providers: [ReliefSupplyRequestsService],

  exports: [ReliefSupplyRequestsService],
})
export class ReliefSupplyRequestsModule {}
