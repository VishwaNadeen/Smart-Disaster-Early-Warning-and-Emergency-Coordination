import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HelpRequestsController } from './help-requests.controller';
import { HelpRequestsService } from './help-requests.service';
import { HelpRequest, HelpRequestSchema } from './schemas/help-request.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { RescueTeam, RescueTeamSchema } from '../rescue-teams/schemas/rescue-team.schema';
@Module({
  imports: [MongooseModule.forFeature([
    { name: HelpRequest.name, schema: HelpRequestSchema },
    { name: User.name, schema: UserSchema },
    { name: RescueTeam.name, schema: RescueTeamSchema },
  ])],
  controllers: [HelpRequestsController],
  providers: [HelpRequestsService],
  exports: [HelpRequestsService],
})
export class HelpRequestsModule {}
