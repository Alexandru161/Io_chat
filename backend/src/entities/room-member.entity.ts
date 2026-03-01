import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Room } from "./room.entity";
import { User } from "./user.entity";

@Entity({ name: "room_members" })
export class RoomMember {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ default: "member" })
  role!: string;

  @ManyToOne(() => Room, (room) => room.members, { onDelete: "CASCADE" })
  room!: Room;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: "CASCADE" })
  user!: User;
}
