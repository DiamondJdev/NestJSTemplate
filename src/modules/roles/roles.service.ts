import { Injectable, NotFoundException } from "@nestjs/common";
import { DbService } from "../db/db.service";
import { UserRole } from "../core/utils/userRole.enum";

@Injectable()
export class RolesService {
  constructor(private readonly dbService: DbService) {}

  async getRoles(userId: string): Promise<UserRole[]> {
    const user = await this.dbService.findOne(userId);
    if (!user) throw new NotFoundException({ message: "User not found" });
    return user.roles;
  }
}
