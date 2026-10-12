
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { OfficerModule } from './officer/officer.module';
import { SheltersModule } from './shelters/shelters.module';
import { ReliefSuppliesModule } from './relief-supplies/relief-supplies.module';
import { ReliefSupplyRequestsModule } from './relief-supply-requests/relief-supply-requests.module';

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
    ReliefSuppliesModule,
    ReliefSupplyRequestsModule,
  ],
})
export class AppModule {}
