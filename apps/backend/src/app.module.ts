import { Module } from '@nestjs/common';
import { ConfigModule} from '@nestjs/config';

import {
  DatabaseModule,
} from './database/database.module';

import {
  AuthModule,
} from './auth/auth.module';

import {
  UsersModule,
} from './users/users.module';

import {
  ReportsModule,
} from './reports/reports.module';

import { AdminModule } from './admin/admin.module';

import { OfficerModule } from './officer/officer.module';

// Register shelter management endpoints and services.
import { SheltersModule } from './shelters/shelters.module';

// Register rescue teams management endpoints and services.
import { RescueTeamsModule } from './rescue-teams/rescue-teams.module';

// Register hazard early warning alerts and notification dispatch.
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

    AdminModule,

    OfficerModule,

    SheltersModule,

    RescueTeamsModule,

    HazardAlertsModule,
  ],
})
export class AppModule {}