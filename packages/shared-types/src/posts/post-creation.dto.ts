import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class CreatePostDto {
  @ApiProperty({
    description: "The ID of the user creating the post",
    example: "uuid-string",
  })
  @IsString({ message: "User ID must be a string" })
  @IsUUID(undefined, { message: "User ID must be a valid UUID" })
  @IsNotEmpty({ message: "User ID is required" })
  userId!: string;

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
