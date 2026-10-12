import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RescueTeam,
  RescueTeamSchema,
} from './schemas/rescue-team.schema';
import {
  User,
  UserSchema,
} from '../users/schemas/user.schema';
import { RescueTeamsController } from './rescue-teams.controller';
import { RescueTeamsService } from './rescue-teams.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: RescueTeam.name,
        schema: RescueTeamSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [RescueTeamsController],
  providers: [RescueTeamsService],
  exports: [RescueTeamsService],
})
export class RescueTeamsModule {}
