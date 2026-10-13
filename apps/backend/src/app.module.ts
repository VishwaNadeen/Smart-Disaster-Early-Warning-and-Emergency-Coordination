import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ReportsModule } from './reports/reports.module';
import { HelpRequestsModule } from './help-requests/help-requests.module';
import { AdminModule } from './admin/admin.module';
import { OfficerModule } from './officer/officer.module';
import { SheltersModule } from './shelters/shelters.module';
import { ReliefSuppliesModule } from './relief-supplies/relief-supplies.module';
import { RescueTeamsModule } from './rescue-teams/rescue-teams.module';
import { HazardAlertsModule } from './hazard-alerts/hazard-alerts.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ReportsModule,
    HelpRequestsModule,
    AdminModule,
    OfficerModule,
    SheltersModule,
    ReliefSuppliesModule,
    RescueTeamsModule,
    HazardAlertsModule,
    HelpRequestsModule,
  ],
})
export class AppModule {}