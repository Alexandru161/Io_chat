import { IsIn, IsString, MinLength } from "class-validator";
import { ROLES } from "../../common/roles.constants";

export class UpdateUserRoleDto {
  @IsString()
  @MinLength(3)
  @IsIn([ROLES.ADMIN, ROLES.SUPPORT, ROLES.USER])
  role!: string;
}