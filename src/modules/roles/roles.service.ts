import { Injectable, NotFoundException } from "@nestjs/common";
import { UsersService } from "../db/services/users.service";
import { UserRole } from "../core/utils/userRole.enum";

@Injectable()
export class RolesService {
  constructor(private readonly usersService: UsersService) {}

  async getRoles(userId: string): Promise<UserRole[]> {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new NotFoundException({ message: "User not found" });
    return user.roles;
  }
}
