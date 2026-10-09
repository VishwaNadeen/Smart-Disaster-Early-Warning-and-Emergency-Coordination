import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!required?.length) return true;
    const req = context.switchToHttp().getRequest();
    if (!req.user || !required.includes(req.user.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
    return true;
  }
}
