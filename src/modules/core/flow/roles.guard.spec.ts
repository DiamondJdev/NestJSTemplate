import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";
import { UserRole } from "../utils/userRole.enum";

@Roles(UserRole.ADMIN)
class AdminOnlyController {
  undecorated(this: void) {}

  @Roles(UserRole.ADMIN, UserRole.USER)
  openToUsers(this: void) {}
}

function contextFor(
  handler: () => void,
  roles: UserRole[],
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => AdminOnlyController,
    switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  const guard = new RolesGuard(new Reflector());
  const proto = AdminOnlyController.prototype;

  it("applies class-level @Roles to handlers that declare none", () => {
    expect(() =>
      guard.canActivate(contextFor(proto.undecorated, [UserRole.USER])),
    ).toThrow(ForbiddenException);
  });

  it("lets handler-level @Roles override class-level @Roles", () => {
    expect(
      guard.canActivate(contextFor(proto.openToUsers, [UserRole.USER])),
    ).toBe(true);
  });
});
