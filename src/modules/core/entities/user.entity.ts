import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { UserRole } from "../utils/userRole.enum";
import { tokenEncryptionTransformer } from "../utils/token-encryption.transformer";

@Entity({ name: "users" })
@Index("idx_users_username", ["username"])
export class User {
  @PrimaryGeneratedColumn("uuid")
  id?: string;

  @Column({ unique: true, length: 64 })
  username!: string;

  @Column({ length: 255 })
  password!: string;

  @Column("text", { array: true, default: ["user"] })
  roles!: UserRole[];

  @Column({ type: "varchar", length: 512, nullable: true, transformer: tokenEncryptionTransformer })
  refreshTokenHash?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  refreshTokenExpiresAt?: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt?: Date;
}
