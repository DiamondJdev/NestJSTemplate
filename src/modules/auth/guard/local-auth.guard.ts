import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Triggers the passport-local strategy for POST /auth/login.
@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {}
