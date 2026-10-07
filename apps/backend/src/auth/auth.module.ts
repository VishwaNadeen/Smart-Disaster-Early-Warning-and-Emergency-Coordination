import {
  Module,
} from '@nestjs/common';

import {
  JwtModule,
} from '@nestjs/jwt';

import {
  PassportModule,
} from '@nestjs/passport';

import {
  MongooseModule,
} from '@nestjs/mongoose';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import {
  AuthController,
} from './auth.controller';

import {
  AuthService,
} from './auth.service';

import {
  JwtStrategy,
} from './jwt.strategy';

import {
  User,
  UserSchema,
} from '../users/schemas/user.schema';

import type { SignOptions } from 'jsonwebtoken';

@Module({
  imports: [
    PassportModule,

    JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],

        useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),

            signOptions: {
            expiresIn:
                configService.get<SignOptions['expiresIn']>('JWT_EXPIRES_IN') ||
                '7d',
            },
        }),
        }),

    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,
    JwtStrategy,
  ],

  exports: [
    AuthService,
  ],
})
export class AuthModule {}