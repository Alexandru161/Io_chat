import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Message } from "../entities/message.entity";
import { Room } from "../entities/room.entity";
import { User } from "../entities/user.entity";

@Injectable()
export class MessagesService {
	constructor(
		@InjectRepository(Message)
		private readonly messagesRepo: Repository<Message>,
		@InjectRepository(Room)
		private readonly roomsRepo: Repository<Room>,
		@InjectRepository(User)
		private readonly usersRepo: Repository<User>
	) {}

	async listByRoom(roomId: string) {
		const messages = await this.messagesRepo.find({
			where: { room: { id: roomId } },
			relations: ["user", "room"],
			order: { createdAt: "ASC" }
		});

		return messages.map((message) => ({
			id: message.id,
			content: message.content,
			roomId: message.room?.id,
			createdAt: message.createdAt,
			user: message.user
				? { id: message.user.id, username: message.user.username, role: message.user.role }
				: null
		}));
	}

	async createMessage(roomId: string, userId: string, content: string) {
		const room = await this.roomsRepo.findOne({ where: { id: roomId } });
		if (!room) {
			throw new BadRequestException("Room not found");
		}

		const user = await this.usersRepo.findOne({ where: { id: userId } });
		if (!user) {
			throw new BadRequestException("User not found");
		}
		if (user.isBanned) {
			throw new ForbiddenException("User is banned");
		}

		const message = this.messagesRepo.create({
			content,
			room: { id: roomId },
			user: { id: userId }
		});
		await this.messagesRepo.save(message);
		const stored = await this.messagesRepo.findOne({
			where: { id: message.id },
			relations: ["user", "room"]
		});

		if (!stored) {
			return { id: message.id, content, roomId };
		}

		return {
			id: stored.id,
			content: stored.content,
			roomId: stored.room?.id,
			createdAt: stored.createdAt,
			user: stored.user
				? { id: stored.user.id, username: stored.user.username, role: stored.user.role }
				: null
		};
	}

	async listForAdminPaged(query: {
		page?: number;
		pageSize?: number;
		q?: string;
		roomId?: string;
		from?: Date;
		to?: Date;
		sortDir?: "asc" | "desc";
	}) {
		const page = Math.max(1, query.page ?? 1);
		const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
		const sortDir = query.sortDir === "asc" ? "ASC" : "DESC";

		const qb = this.messagesRepo
			.createQueryBuilder("message")
			.leftJoinAndSelect("message.user", "user")
			.leftJoinAndSelect("message.room", "room");

		if (query.roomId) {
			qb.andWhere("room.id = :roomId", { roomId: query.roomId });
		}

		if (query.q) {
			qb.andWhere(
				"message.content ILIKE :q OR user.username ILIKE :q OR room.id::text ILIKE :q",
				{ q: `%${query.q}%` }
			);
		}

		if (query.from) {
			qb.andWhere("message.createdAt >= :from", { from: query.from.toISOString() });
		}

		if (query.to) {
			qb.andWhere("message.createdAt <= :to", { to: query.to.toISOString() });
		}

		qb.orderBy("message.createdAt", sortDir);

		const total = await qb.getCount();
		const totalPages = Math.max(1, Math.ceil(total / pageSize));
		const safePage = Math.min(page, totalPages);

		const messages = await qb
			.skip((safePage - 1) * pageSize)
			.take(pageSize)
			.getMany();

		return {
			data: messages.map((message) => ({
				id: message.id,
				content: message.content,
				roomId: message.room?.id,
				createdAt: message.createdAt,
				user: message.user
					? { id: message.user.id, username: message.user.username, role: message.user.role }
					: null
			})),
			page: safePage,
			pageSize,
			total,
			totalPages
		};
	}

	async updateMessage(messageId: string, content: string) {
		await this.messagesRepo.update({ id: messageId }, { content });
		const stored = await this.messagesRepo.findOne({
			where: { id: messageId },
			relations: ["user", "room"]
		});

		if (!stored) {
			return null;
		}

		return {
			id: stored.id,
			content: stored.content,
			roomId: stored.room?.id,
			createdAt: stored.createdAt,
			user: stored.user
				? { id: stored.user.id, username: stored.user.username, role: stored.user.role }
				: null
		};
	}

	async deleteMessage(messageId: string) {
		await this.messagesRepo.delete({ id: messageId });
		return { id: messageId };
	}

	async bulkDelete(ids: string[]) {
		await this.messagesRepo.delete(ids);
		return { deleted: ids.length };
	}
}
