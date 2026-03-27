import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { AssetDto } from "./assets.dto";

export class CreatePostDto {
  @ApiProperty({
    description: "The ID of the user creating the post",
    example: 1,
  })
  @IsNumber({}, { message: "User ID must be a valid number" })
  @IsNotEmpty({ message: "User ID is required" })
  userId!: number;

  @ApiProperty({
    description: "The content of the post",
    example: "This is my first post!",
    minLength: 1,
  })
  @IsString({ message: "Content must be a string" })
  @IsNotEmpty({ message: "Content cannot be empty" })
  content!: string;

  @ApiPropertyOptional({
    description: "Array of media assets (images/videos) attached to the post",
    type: [AssetDto],
  })
  @IsOptional()
  @IsArray({ message: "Assets must be an array" })
  @Type(() => AssetDto)
  assets?: AssetDto[];
}
