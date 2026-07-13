import { IsString, IsOptional, IsArray } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  content!: string;

  @ApiPropertyOptional({
    description: "Array of pre-uploaded asset IDs to attach",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assetIds?: string[];
}
