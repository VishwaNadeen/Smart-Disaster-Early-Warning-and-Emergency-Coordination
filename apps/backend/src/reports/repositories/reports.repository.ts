
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  DisasterReport,
  ReportDocument,
  ReportStatus,
  HazardType,
} from '../schemas/report.schema';

import {
  User,
  UserDocument,
} from '../../users/schemas/user.schema';

@Injectable()
export class ReportsRepository {
  constructor(
    @InjectModel(DisasterReport.name)
    private readonly reportModel: Model<ReportDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findActiveUser(
    userId: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findById(userId);
  }

  async findActiveReport(
    reportId: string,
  ): Promise<ReportDocument | null> {
    return this.reportModel
      .findOne({
        _id: reportId,
        deletedAt: { $exists: false },
      });
  }

  async findCitizenReport(
    citizenId: string,
    reportId: string,
  ): Promise<ReportDocument | null> {
    return this.reportModel
      .findOne({
        _id: reportId,
        citizenId,
        deletedAt: { $exists: false },
      });
  }

  async findReportsByCitizen(
    citizenId: string,
  ) {
    return this.reportModel
      .find({
        citizenId,
        deletedAt: { $exists: false },
      })
      .sort({ submittedAt: -1 })
      .lean();
  }

  async createReport(
    data: any,
  ) {
    return this.reportModel.create(data);
  }

  async saveReport(
    report: ReportDocument,
  ): Promise<ReportDocument> {
    return report.save();
  }

  async findPotentialDuplicate(params: {
    hazardType?: HazardType;
    latitude?: number;
    longitude?: number;
  }): Promise<boolean> {
    if (
      params.latitude === undefined ||
      params.longitude === undefined ||
      !Number.isFinite(params.latitude) ||
      !Number.isFinite(params.longitude)
    ) {
      return false;
    }

    const range = 0.01;

    const existing = await this.reportModel
      .findOne({
        hazardType: params.hazardType,
        status: {
          $in: [
            ReportStatus.PENDING_VERIFICATION,
            ReportStatus.VERIFIED,
          ],
        },
        deletedAt: { $exists: false },
        latitude: {
          $gte: params.latitude - range,
          $lte: params.latitude + range,
        },
        longitude: {
          $gte: params.longitude - range,
          $lte: params.longitude + range,
        },
      });

    return Boolean(existing);
  }

  async getDistrictSources(): Promise<
    [unknown[], unknown[], unknown[]]
  > {
    return Promise.all([
      this.reportModel.distinct('district', {
        deletedAt: { $exists: false },
        district: { $exists: true, $ne: '' },
      }),

      this.userModel.distinct('district', {
        isActive: true,
      }),

      this.userModel.distinct('assignedDistricts', {
        isActive: true,
      }),
    ]);
  }

  async findOfficerReports(
    conditions: Record<string, unknown>[],
  ) {
    return this.reportModel
      .find({ $and: conditions })
      .sort({
        submittedAt: -1,
        createdAt: -1,
      })
      .lean();
  }

  async findCitizensByIds(
    citizenIds: string[],
  ) {
    if (citizenIds.length === 0) {
      return [];
    }

    return this.userModel
      .find({
        _id: {
          $in: citizenIds.filter((id) =>
            Types.ObjectId.isValid(id),
          ),
        },
      })
      .select('fullName email phone district')
      .lean();
  }

  async findCitizenSummary(
    citizenId: string,
  ) {
    return this.userModel
      .findById(citizenId)
      .select('fullName email phone district')
      .lean();
  }
}
