import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  JwtService,
} from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

import {
  User,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';

import {
  RegisterDto,
} from './dto/register.dto';

import {
  LoginDto,
} from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel:
      Model<UserDocument>,

    private readonly jwtService:
      JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email =
      dto.email.toLowerCase().trim();

    const existingUser =
      await this.userModel.findOne({
        email,
      });

    if (existingUser) {
      throw new ConflictException(
        'Email is already registered',
      );
    }

    const passwordHash =
      await bcrypt.hash(
        dto.password,
        12,
      );

    const user =
      await this.userModel.create({
        fullName:
          dto.fullName.trim(),

        email,

        passwordHash,

        phone: dto.phone,

        district: dto.district,

        address: dto.address,

        role: UserRole.CITIZEN,

        isActive: true,
      });

    const token =
      await this.generateToken(
        user.id,
        user.role,
      );

    return {
      success: true,

      message:
        'Citizen account created successfully',

      data: {
        user:
          this.publicUser(user),

        token,
      },
    };
  }

  async login(dto: LoginDto) {
    const email =
      dto.email.toLowerCase().trim();

    const user =
      await this.userModel.findOne({
        email,
      });

    if (
      !user ||
      !user.isActive
    ) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const passwordMatches =
      await bcrypt.compare(
        dto.password,
        user.passwordHash,
      );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const token =
      await this.generateToken(
        user.id,
        user.role,
      );

    return {
      success: true,

      message: 'Login successful',

      data: {
        user:
          this.publicUser(user),

        token,
      },
    };
  }

  private async generateToken(
    userId: string,
    role: UserRole,
  ) {
    return this.jwtService.signAsync({
      sub: userId,
      role,
    });
  }

  public publicUser(user: UserDocument) {
    return {
      id: user.id,

      fullName:
        user.fullName,

      email:
        user.email,

      phone:
        user.phone,

      district:
        user.district,

      address:
        user.address,

      role:
        user.role,

      isActive:
        user.isActive,

      createdAt:
        user.createdAt,
    };
  }
}