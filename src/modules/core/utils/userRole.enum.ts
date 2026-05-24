export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

export const roleHierarchy: Record<UserRole, UserRole[]> = {
  [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.USER],
  [UserRole.USER]: [UserRole.USER],
};
