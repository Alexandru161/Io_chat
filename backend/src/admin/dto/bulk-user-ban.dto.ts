import { ArrayNotEmpty, IsArray, IsBoolean, IsUUID } from "class-validator";

export class BulkUserBanDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  ids!: string[];

  @IsBoolean()
  isBanned!: boolean;
}
