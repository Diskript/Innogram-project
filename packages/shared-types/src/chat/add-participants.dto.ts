import { ArrayMinSize, IsArray, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AddParticipantsDto {
  @ApiProperty({ description: "User IDs to add to the conversation" })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  userIds!: string[];
}
