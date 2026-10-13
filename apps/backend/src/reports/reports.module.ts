
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './repositories/reports.repository';

import {
  DisasterReport,
  ReportSchema,
} from './schemas/report.schema';

import {
  User,
  UserSchema,
} from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DisasterReport.name,
        schema: ReportSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],

  controllers: [
    ReportsController,
  ],

  providers: [
    ReportsService,
    ReportsRepository,
  ],

  exports: [
    ReportsService,
  ],
})
export class ReportsModule {}
