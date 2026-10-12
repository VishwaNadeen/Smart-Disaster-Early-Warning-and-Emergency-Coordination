
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Import the Shelter schema.
import {
  Shelter,
  ShelterSchema,
} from './schemas/shelter.schema';

// Import the User model and schema for permission checks.
import {
  User,
  UserSchema,
} from '../users/schemas/user.schema';

// Import the occupancy history schema for audit records.
import {
  OccupancyHistory,
  OccupancyHistorySchema,
} from './schemas/occupancy-history.schema';

// Import the shelter business logic service.
import { SheltersService } from './shelters.service';

// Import the controller that exposes shelter API endpoints.
import { SheltersController } from './shelters.controller';

@Module({
  // Register all Mongoose models used by shelter management.
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
      {
        name: OccupancyHistory.name,
        schema: OccupancyHistorySchema,
      },
    ]),
  ],

  // Register the shelter API controller.
  controllers: [SheltersController],

  // Register the shelter business logic service.
  providers: [SheltersService],

  // Make the service available to other modules if needed.
  exports: [SheltersService],
})
export class SheltersModule {}
