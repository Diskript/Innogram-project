import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  ArrayMinSize,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateConversationDto {
  @ApiPropertyOptional({
    description: "Conversation name (required if isGroup)",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @ApiProperty({
    description:
      "Array of participant user IDs (excluding the creator). At least 1 required.",
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  participantIds!: string[];
}
