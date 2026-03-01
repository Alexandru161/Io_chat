import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Room } from "./room.entity";
import { User } from "./user.entity";

@Entity({ name: "messages" })
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  content!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => Room, (room) => room.messages, { onDelete: "CASCADE" })
  room!: Room;

  @ManyToOne(() => User, (user) => user.messages, { onDelete: "CASCADE" })
  user!: User;
}
