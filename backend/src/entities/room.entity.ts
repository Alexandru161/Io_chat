import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RoomMember } from "./room-member.entity";
import { Message } from "./message.entity";

@Entity({ name: "rooms" })
export class Room {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @OneToMany(() => RoomMember, (member) => member.room)
  members!: RoomMember[];

  @OneToMany(() => Message, (message) => message.room)
  messages!: Message[];
}
