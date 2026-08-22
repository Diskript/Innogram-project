import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { Visibility } from "../assets/visibility.enum";

export class CreatePostDto {
  @ApiPropertyOptional({
    description: "Visibility of the post",
    enum: Visibility,
    default: Visibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(Visibility, {
    message: "Visibility must be PUBLIC, FOLLOWERS, or PRIVATE",
  })
  visibility?: Visibility = Visibility.PUBLIC;
  @ApiPropertyOptional({
    description: "The ID of the user creating the post (overridden by JWT)",
    example: "uuid-string",
  })
  @IsOptional()
  @IsString({ message: "User ID must be a string" })
  @IsUUID(undefined, { message: "User ID must be a valid UUID" })
  userId?: string;

  @ApiProperty({
    description: "The content of the post",
    example: "This is my first post!",
    minLength: 1,
  })
  @IsString({ message: "Content must be a string" })
  @IsNotEmpty({ message: "Content cannot be empty" })
  content!: string;

  @ApiPropertyOptional({
    description: "UUIDs of pre-uploaded assets to attach to the post",
    type: [String],
    example: ["uuid-1", "uuid-2"],
  })
  @IsOptional()
  @IsArray({ message: "Asset IDs must be an array" })
  @IsUUID(undefined, {
    each: true,
    message: "Each asset ID must be a valid UUID",
  })
  assetIds?: string[];
}
