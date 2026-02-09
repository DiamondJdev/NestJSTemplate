import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ unique: true })
  username: string;

  @CreateDateColumn()
  createdAt?: Date;

  @Column()
  password: string;

  @Column()
  role: string;

  @Column({ nullable: true })
  refreshTokenHash?: string;
}
