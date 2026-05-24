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

export function getAllowedRoles(userRoles: UserRole[]): UserRole[] {
  const allowed = new Set<UserRole>();
  userRoles.forEach((userRole) => {
    const roles = roleHierarchy[userRole];
    if (roles) roles.forEach((r) => allowed.add(r));
  });
  return Array.from(allowed);
}

export function optimizeRoles(roles: UserRole[]): UserRole[] {
  if (roles.includes(UserRole.ADMIN)) return [UserRole.ADMIN];
  return roles.filter((role, index) => roles.indexOf(role) === index);
}

export function isValidRoles(roles: UserRole[]): boolean {
  return roles.every((role) => Object.values(UserRole).includes(role));
}
