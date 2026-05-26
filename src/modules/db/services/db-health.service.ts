import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../core/entities/user.entity";

@Injectable()
export class DbHealthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async healthCheck(): Promise<boolean> {
    try {
      await this.userRepository.query("SELECT 1");

      const relationResult: unknown[] = await this.userRepository.query(
        "SELECT to_regclass('public.users') AS users_table",
      );

      if (!Array.isArray(relationResult) || relationResult.length === 0)
        return false;

      const firstRow: unknown = relationResult[0];
      if (typeof firstRow !== "object" || firstRow === null) return false;

      const usersTable = (firstRow as Record<string, unknown>).users_table;
      return typeof usersTable === "string" && usersTable.length > 0;
    } catch {
      return false;
    }
  }
}
