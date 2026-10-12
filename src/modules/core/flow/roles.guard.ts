import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { hasPermission } from "../utils/roleChecker";
import { UserRole } from "../utils/userRole.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // getAllAndOverride, not get: a class-level @Roles applies to handlers
    // that declare none, and a handler-level @Roles overrides it.
    const requiredRoles = this.reflector.getAllAndOverride<string[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { roles?: string[] } }>();
    const { user } = req;
    if (!user) throw new ForbiddenException("User not authenticated");

    if (!user.roles || !Array.isArray(user.roles))
      throw new ForbiddenException("User roles not found");

    const hasRole = hasPermission(user.roles as UserRole[], requiredRoles as UserRole[]);
    if (!hasRole) throw new ForbiddenException("Insufficient permissions");

    return true;
  }
}
