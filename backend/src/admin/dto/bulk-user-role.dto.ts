import { ArrayNotEmpty, IsArray, IsIn, IsString, IsUUID } from "class-validator";
import { ROLES } from "../../common/roles.constants";

export class BulkUserRoleDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  ids!: string[];

  @IsString()
  @IsIn([ROLES.ADMIN, ROLES.SUPPORT, ROLES.USER])
  role!: string;
}
