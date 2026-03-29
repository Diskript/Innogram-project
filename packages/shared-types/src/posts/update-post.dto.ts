import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdatePostDto {
  @ApiPropertyOptional({
    description: "The content of the post",
    example: "This is my updated post!",
  })
  @IsOptional()
  @IsString({ message: "Content must be a string" })
  content?: string;

  @ApiPropertyOptional({
    description: "Whether the post is archived",
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: "Archived must be a boolean" })
  archived?: boolean;
}
