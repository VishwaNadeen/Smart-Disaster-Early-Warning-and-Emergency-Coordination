
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
    // Read the JWT secret from environment configuration.
    const jwtSecret = process.env.JWT_SECRET;

    // Prevent the application from starting without a JWT secret.
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      // Extract the token from the Authorization: Bearer header.
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Reject expired JWT tokens.
      ignoreExpiration: false,

      // Use the configured secret to validate JWT signatures.
      secretOrKey: jwtSecret,
    });
  }

  async validate(
    payload: {
      sub: string;
      role: string;
    },
  ) {
    // Find the user associated with the JWT subject.
    const user =
      await this.userModel.findById(
        payload.sub,
      );

    // Reject requests from missing or deactivated accounts.
    if (
      !user ||
      !user.isActive
    ) {
      throw new UnauthorizedException(
        'User is not active',
      );
    }

    // Passport attaches this returned object to req.user.
    return {
      id: user.id,

      role: user.role,

      email: user.email,
    };
  }
}
