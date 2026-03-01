import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Room } from "../entities/room.entity";

type RoomListQuery = {
	page?: number;
	pageSize?: number;
	q?: string;
	sortBy?: "createdAt" | "name";
	sortDir?: "asc" | "desc";
};

@Injectable()
export class RoomsService {
	constructor(
		@InjectRepository(Room)
		private readonly roomsRepo: Repository<Room>
	) {}

	async listRooms() {
		const rooms = await this.roomsRepo.find();
		return rooms.map((room) => ({ id: room.id, name: room.name, createdAt: room.createdAt }));
	}

	async listRoomsPaged(query: RoomListQuery) {
		const page = Math.max(1, query.page ?? 1);
		const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
		const sortBy = query.sortBy ?? "createdAt";
		const sortDir = query.sortDir === "asc" ? "ASC" : "DESC";

		const qb = this.roomsRepo.createQueryBuilder("room");

		if (query.q) {
			qb.andWhere("room.name ILIKE :q OR room.id::text ILIKE :q", { q: `%${query.q}%` });
		}

		const sortColumn = sortBy === "name" ? "room.name" : "room.createdAt";
		qb.orderBy(sortColumn, sortDir);

		const total = await qb.getCount();
		const totalPages = Math.max(1, Math.ceil(total / pageSize));
		const safePage = Math.min(page, totalPages);

		const rooms = await qb
			.skip((safePage - 1) * pageSize)
			.take(pageSize)
			.getMany();

		return {
			data: rooms.map((room) => ({ id: room.id, name: room.name, createdAt: room.createdAt })),
			page: safePage,
			pageSize,
			total,
			totalPages
		};
	}

	async createRoom(name: string) {
		const room = this.roomsRepo.create({ name });
		const saved = await this.roomsRepo.save(room);
		return { id: saved.id, name: saved.name };
	}

	findById(roomId: string) {
		return this.roomsRepo.findOne({ where: { id: roomId } });
	}

	async updateRoomName(roomId: string, name: string) {
		await this.roomsRepo.update({ id: roomId }, { name });
		return this.findById(roomId);
	}

	async deleteRoom(roomId: string) {
		await this.roomsRepo.delete({ id: roomId });
		return { id: roomId };
	}

	async bulkDelete(ids: string[]) {
		await this.roomsRepo.delete({ id: In(ids) });
		return { deleted: ids.length };
	}
}
