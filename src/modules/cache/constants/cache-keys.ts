export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userSafe: (userId: string) => `user_safe:${userId}`,
  userRole: (userId: string) => `user_role:${userId}`,
  refreshToken: (userId: string) => `refreshToken:${userId}`,
  allUsers: () => "users:all",
};
