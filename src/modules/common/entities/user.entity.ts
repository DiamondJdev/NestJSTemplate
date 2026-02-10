import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

@Entity()
export class User {
  // Auto-generated UUID primary key for the user entity
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  // TypeORM.save() will throw QueryFailedError on duplicate username
  @Column({ unique: true, length: 64 })
  username: string;

  @CreateDateColumn()
  createdAt?: Date;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ nullable: true })
  refreshTokenHash?: string;
}
