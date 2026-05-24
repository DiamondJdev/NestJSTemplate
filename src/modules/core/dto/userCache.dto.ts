import { UserRole } from "../utils/userRole.enum";

export class UserCacheDto {
  id!: string;
  username!: string;
  roles!: UserRole[];
  refreshTokenExpiresAt?: Date;
  createdAt?: Date;

  constructor(partial: Partial<UserCacheDto>) {
    Object.assign(this, partial);
  }
}
