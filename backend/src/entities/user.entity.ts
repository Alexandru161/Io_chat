import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RoomMember } from "./room-member.entity";
import { Message } from "./message.entity";
import { RefreshToken } from "./refresh-token.entity";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  passwordHash!: string;

  @Column({ default: "user" })
  role!: string;

  @Column({ default: false })
  isBanned!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @OneToMany(() => RoomMember, (member) => member.user)
  memberships!: RoomMember[];

  @OneToMany(() => Message, (message) => message.user)
  messages!: Message[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: RefreshToken[];
}
