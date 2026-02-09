import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class BodyRequiredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const body: unknown = req.body;

    // Type guard for a non-empty plain object
    const isNonEmptyPlainObject = (value: unknown):
    value is Record<string, unknown> =>
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0;

    if (!isNonEmptyPlainObject(body)) throw new BadRequestException("Request body is required");
    return true;
  }
}
