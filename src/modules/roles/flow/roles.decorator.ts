import { SetMetadata } from "@nestjs/common";

// Litterally just a wrapper to add metadata for roles
export const Roles = (...roles: string[]) => SetMetadata("roles", roles);
