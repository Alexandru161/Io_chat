import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ROLES } from "../../common/roles.constants";

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn([ROLES.ADMIN, ROLES.SUPPORT, ROLES.USER])
  role?: string;

  @IsOptional()
  @IsIn(["active", "banned"])
  status?: "active" | "banned";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsIn(["createdAt", "username", "role"])
  sortBy?: "createdAt" | "username" | "role";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: "asc" | "desc";
}
