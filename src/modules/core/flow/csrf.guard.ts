import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";

/**
 * CSRF mitigation guard using the Custom Request Header pattern.
 *
 * With `sameSite: 'none'` cookies in production, browsers will attach cookies
 * to cross-origin requests, making the application vulnerable to CSRF attacks.
 * HTML forms and cross-origin fetches cannot set arbitrary custom headers without
 * passing a CORS preflight first — which our ALLOWED_ORIGINS whitelist blocks for
 * untrusted origins. Requiring this header on all mutating requests therefore
 * prevents cross-site state changes even when cookies are present.
 *
 * Frontend clients must include the following header on every POST, PUT, PATCH,
 * and DELETE request:
 *
 *   X-Requested-With: XMLHttpRequest
 *
 * Safe HTTP methods (GET, HEAD, OPTIONS) are exempt — they must not produce
 * side-effects on the server anyway (RFC 7231 §4.2.1).
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#employing-custom-request-headers-for-ajaxapi
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const CSRF_HEADER_NAME = "x-requested-with" as const;
export const CSRF_HEADER_VALUE = "XMLHttpRequest" as const;

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (!MUTATING_METHODS.has(req.method)) {
      return true;
    }

    const headerValue = req.headers[CSRF_HEADER_NAME];

    if (headerValue !== CSRF_HEADER_VALUE) {
      throw new ForbiddenException(
        "CSRF check failed. Check request headers and try again",
      );
    }

    return true;
  }
}
