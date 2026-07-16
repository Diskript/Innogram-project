import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { Visibility } from "../assets/visibility.enum";

export class UpdatePostDto {
  @ApiPropertyOptional({
    description: "Visibility of the post",
    enum: Visibility,
  })
  @IsOptional()
  @IsEnum(Visibility, {
    message: "Visibility must be PUBLIC, FOLLOWERS, or PRIVATE",
  })
  visibility?: Visibility;
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
