// Use this if your existing auth module doesn't already export a JWT guard.
// Passport must be configured with a strategy named 'jwt'.
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
