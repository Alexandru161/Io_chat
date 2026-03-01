import { IsString, MinLength } from "class-validator";

export class UpdateRoomDto {
  @IsString()
  @MinLength(2)
  name!: string;
}