
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ReliefSuppliesController } from './relief-supplies.controller';

import { ReliefSuppliesService } from './relief-supplies.service';
import { ReliefSupplyDistributionsService } from './relief-supply-distributions.service';

import {
  ReliefSupply,
  ReliefSupplySchema,
} from './schemas/relief-supply.schema';

import {
  ReliefSupplyDistribution,
  ReliefSupplyDistributionSchema,
} from './schemas/relief-supply-distribution.schema';

import {
  Shelter,
  ShelterSchema,
} from '../shelters/schemas/shelter.schema';

import {
  User,
  UserSchema,
} from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ReliefSupply.name,
        schema: ReliefSupplySchema,
      },
      {
        name: ReliefSupplyDistribution.name,
        schema: ReliefSupplyDistributionSchema,
      },
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
  controllers: [ReliefSuppliesController],
  providers: [
    ReliefSuppliesService,
    ReliefSupplyDistributionsService,
  ],
  exports: [
    ReliefSuppliesService,
    ReliefSupplyDistributionsService,
  ],
})
export class ReliefSuppliesModule {}
