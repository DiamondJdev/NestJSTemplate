# NestJS Best-Practice Review (SQLite now, PostgreSQL later)

Scope: all non-test source files under src.

## Findings and Suggested Fixes (Prioritized)

P1 - 6) Guards should avoid decode-before-verify patterns

- Files: src/modules/auth/guard/jwt-auth.guard.ts
- Issue: The guard verifies the token, then decodes it using decodeToken (which is explicitly noted as unsafe). Even though verify runs first, the decode method itself is marked for non-prod use.
- Suggestion: Use verifyAndDecode in JwtService or jwtService.verifyAsync to both validate and decode in one step.

P2 - 7) Role checks should use shared role utilities

- Files: src/modules/roles/flow/roles.guard.ts, src/modules/common/utils/roleChecker.ts
- Issue: RolesGuard checks simple inclusion, while role hierarchy logic exists in roleChecker.ts but is unused.
- Suggestion: Use hasPermission from roleChecker.ts to enforce hierarchy consistently.

P2 - 8) Controller-service layering

- Files: src/modules/users/users.controller.ts
- Issue: UsersController depends directly on DbService (data access layer). NestJS convention favors a domain service (UsersService) that encapsulates data access and business logic.
- Suggestion: Introduce UsersService and have it use DbService, then have UsersController call UsersService.

P3 - 9) Health controller responsibilities

- Files: src/modules/common/controller/health/health.controller.ts
- Issue: HealthController handles latency measurement and response shaping inline. NestJS convention favors small controllers and service-based logic.
- Suggestion: Move health computation into a HealthService and keep controller thin.

P0 - 10) TypeORM config for future PostgreSQL

- Files: src/modules/app.module.ts
- Issue: TypeORM config is hard-coded for sqlite with synchronize: true. This is risky in production and not portable to postgres without change.
- Suggestion: Move DB config to ConfigModule/env; set synchronize: false for prod; use migrations for schema changes. Keep SQLite/Postgres options switchable via env.

P2 - 11) Guard and controller request typing

- Files: src/modules/auth/guard/jwt-auth.guard.ts, src/modules/auth/auth.controller.ts, src/modules/users/users.controller.ts
- Issue: Request typing is ad-hoc (RequestWithUser, AuthenticatedRequest) and duplicated across files.
- Suggestion: Use a shared interface or NestJS Request type augmentation to avoid drift and ensure consistent user typing.

P1 - 12) Error mapping for unique constraint

- Files: src/modules/db/db.service.ts
- Issue: All QueryFailedError cases are treated as duplicate user, which can mask other DB errors.
- Suggestion: Inspect driver error codes (e.g., postgres 23505, sqlite constraint errors) before mapping to ConflictException; otherwise rethrow or map to 500.

## High-Level Next Steps

1) Production readiness

- Move DB config to env-driven config, disable synchronize in prod, add migrations workflow.
- Fix JWT guard to use verify+decode in one step and tighten token validation.

1) Module cleanup

- Remove duplicate ConfigModule.forRoot and reduce forwardRef usage by restructuring shared services.

1) Conventions and consistency

- Align DTO naming/casing, standardize controller base paths, and centralize request typing.

## Notes

- SQLite/Postgres compatibility mostly affects error-code handling, migrations, and configuration; DTO validation and module conventions are portable.
