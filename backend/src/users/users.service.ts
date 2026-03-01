import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User } from "../entities/user.entity";
import { RedisService } from "../redis/redis.service";

type UserListQuery = {
	page?: number;
	pageSize?: number;
	q?: string;
	role?: string;
	status?: "active" | "banned";
	sortBy?: "createdAt" | "username" | "role";
	sortDir?: "asc" | "desc";
};

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(User)
		private readonly usersRepo: Repository<User>,
		private readonly redisService: RedisService
	) {}

	findById(id: string) {
		return this.usersRepo.findOne({ where: { id } });
	}

	findByUsername(username: string) {
		return this.usersRepo.findOne({ where: { username } });
	}

	async createUser(username: string, passwordHash: string, role = "user") {
		const user = this.usersRepo.create({ username, passwordHash, role });
		const saved = await this.usersRepo.save(user);
		await this.redisService.del("cache:users:all");
		return saved;
	}

	async listUsers() {
		const cached = await this.redisService.getJson<
			{ id: string; username: string; role: string; isBanned: boolean; createdAt: Date }[]
		>("cache:users:all");
		if (cached) {
			return cached;
		}

		const users = await this.usersRepo.find();
		const payload = users.map((user) => ({
			id: user.id,
			username: user.username,
			role: user.role,
			isBanned: user.isBanned,
			createdAt: user.createdAt
		}));

		await this.redisService.setJson("cache:users:all", payload, 60);
		return payload;
	}

	async listUsersPaged(query: UserListQuery) {
		const page = Math.max(1, query.page ?? 1);
		const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
		const sortBy = query.sortBy ?? "createdAt";
		const sortDir = query.sortDir === "asc" ? "ASC" : "DESC";

		const qb = this.usersRepo.createQueryBuilder("user");

		if (query.q) {
			qb.andWhere("user.username ILIKE :q OR user.id::text ILIKE :q", { q: `%${query.q}%` });
		}

		if (query.role) {
			qb.andWhere("user.role = :role", { role: query.role });
		}

		if (query.status) {
			qb.andWhere("user.isBanned = :isBanned", { isBanned: query.status === "banned" });
		}

		const sortColumn =
			sortBy === "username" ? "user.username" : sortBy === "role" ? "user.role" : "user.createdAt";

		qb.orderBy(sortColumn, sortDir);

		const total = await qb.getCount();
		const totalPages = Math.max(1, Math.ceil(total / pageSize));
		const safePage = Math.min(page, totalPages);

		const users = await qb
			.skip((safePage - 1) * pageSize)
			.take(pageSize)
			.getMany();

		return {
			data: users.map((user) => ({
				id: user.id,
				username: user.username,
				role: user.role,
				isBanned: user.isBanned,
				createdAt: user.createdAt
			})),
			page: safePage,
			pageSize,
			total,
			totalPages
		};
	}

	async updateRole(userId: string, role: string) {
		await this.usersRepo.update({ id: userId }, { role });
		await this.redisService.del("cache:users:all");
		return this.findById(userId);
	}

	async setBanned(userId: string, isBanned: boolean) {
		await this.usersRepo.update({ id: userId }, { isBanned });
		await this.redisService.del("cache:users:all");
		return this.findById(userId);
	}

	async deleteUser(userId: string) {
		await this.usersRepo.delete({ id: userId });
		await this.redisService.del("cache:users:all");
		return { id: userId };
	}

	async bulkUpdateRole(ids: string[], role: string) {
		await this.usersRepo.update({ id: In(ids) }, { role });
		await this.redisService.del("cache:users:all");
		return { updated: ids.length };
	}

	async bulkUpdateBan(ids: string[], isBanned: boolean) {
		await this.usersRepo.update({ id: In(ids) }, { isBanned });
		await this.redisService.del("cache:users:all");
		return { updated: ids.length };
	}

	async bulkDelete(ids: string[]) {
		await this.usersRepo.delete({ id: In(ids) });
		await this.redisService.del("cache:users:all");
		return { deleted: ids.length };
	}
}
