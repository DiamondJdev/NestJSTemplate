import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { User } from "../../src/modules/core/entities/user.entity";
import { UserRole } from "../../src/modules/core/utils/userRole.enum";
import type { TestAppContext } from "./test-app";

export const CSRF_HEADER = { "X-Requested-With": "XMLHttpRequest" } as const;

export function randomUsername(): string {
  return `e2e${randomBytes(6).toString("hex")}`;
}

export interface CreateTestUserOptions {
  username?: string;
  password?: string;
  roles?: UserRole[];
}

export interface TestUser {
  id: string;
  username: string;
  password: string;
  roles: UserRole[];
}

/**
 * Creates a real user row directly through UsersService, bypassing
 * POST /auth/register (and its 5/min throttle). Roles other than
 * UserRole.USER are only reachable this way — no API endpoint can grant
 * admin, by design.
 */
export async function createTestUser(
  ctx: TestAppContext,
  options: CreateTestUserOptions = {},
): Promise<TestUser> {
  const username = options.username ?? randomUsername();
  const password = options.password ?? "Str0ng!Passw0rd";
  const roles = options.roles ?? [UserRole.USER];

  const hashedPassword = await bcrypt.hash(password, 12);
  const user: User = { username, password: hashedPassword, roles };
  const created = await ctx.usersService.create(user);
  if (!created?.id) throw new Error("Failed to create test user fixture");

  return { id: created.id, username, password, roles };
}

/**
 * Mints a real, fully-valid access/refresh token pair for a user without
 * going through POST /auth/login. The tokens are verified for real by
 * JwtAuthGuard on every request that uses them.
 */
export async function mintTokensFor(
  ctx: TestAppContext,
  user: TestUser,
): Promise<{ accessToken: string; refreshToken: string }> {
  const tokens = await ctx.jwtService.rotateTokens(user.id, user.roles);
  await ctx.refreshTokenService.saveRefreshToken(
    user.id,
    tokens.refreshTokenHash,
    tokens.refreshTokenExpiresAt,
  );
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}

export function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function deleteTestUser(ctx: TestAppContext, userId: string): Promise<void> {
  try {
    await ctx.usersService.remove(userId);
  } catch {
    // Already deleted by the test itself — fine.
  }
}
