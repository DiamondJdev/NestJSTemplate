import { UserRole, roleHierarchy } from "./userRole.enum";

export function hasPermission(
  userRoles: UserRole[],
  requiredRoles: UserRole[],
): boolean {
  return requiredRoles.some((requiredRole) =>
    userRoles.some((userRole) =>
      roleHierarchy[userRole]?.includes(requiredRole),
    ),
  );
}

export function isValidRoles(roles: UserRole[]): boolean {
  return roles.every((role) => Object.values(UserRole).includes(role));
}
