import {
  Module,
} from '@nestjs/common';

import {
  MongooseModule,
} from '@nestjs/mongoose';

import {
  ReportsController,
} from './reports.controller';

import {
  ReportsService,
} from './reports.service';

import {
  DisasterReport,
  ReportSchema,
} from './schemas/report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name:
          DisasterReport.name,

        schema:
          ReportSchema,
      },
    ]),
  ],

  controllers: [
    ReportsController,
  ],

  providers: [
    ReportsService,
  ],

  exports: [
    ReportsService,
  ],
})
export class ReportsModule {}