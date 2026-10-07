import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  PassportStrategy,
} from '@nestjs/passport';

import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  User,
  UserDocument,
} from '../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
) {
  constructor(
  @InjectModel(User.name)
  private readonly userModel: Model<UserDocument>,
) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
  }

  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: false,
    secretOrKey: jwtSecret,
  });
}

  async validate(
    payload: {
      sub: string;
      role: string;
    },
  ) {
    const user =
      await this.userModel.findById(
        payload.sub,
      );

    if (
      !user ||
      !user.isActive
    ) {
      throw new UnauthorizedException(
        'User is not active',
      );
    }

    return {
      id: user.id,

      role: user.role,

      email: user.email,
    };
  }
}