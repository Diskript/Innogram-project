import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: "Receive notifications on new followers",
  })
  @IsOptional()
  @IsBoolean()
  followEnabled?: boolean;

  @ApiPropertyOptional({
    description: "Receive notifications when posts are liked",
  })
  @IsOptional()
  @IsBoolean()
  likeEnabled?: boolean;

  @ApiPropertyOptional({
    description: "Receive notifications when posts are commented on",
  })
  @IsOptional()
  @IsBoolean()
  commentEnabled?: boolean;

  @ApiPropertyOptional({ description: "Receive notifications when mentioned" })
  @IsOptional()
  @IsBoolean()
  mentionEnabled?: boolean;
}
