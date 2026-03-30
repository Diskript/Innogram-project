import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: "Display name of the user",
    example: "John Doe",
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: "Display name must be a string" })
  @MaxLength(50, { message: "Display name cannot exceed 50 characters" })
  displayName?: string;

  @ApiPropertyOptional({
    description: "Birthday of the user",
    example: "1990-01-01",
  })
  @IsOptional()
  @IsDateString({}, { message: "Birthday must be a valid date" })
  birthday?: string;

  @ApiPropertyOptional({
    description: "Bio of the user",
    example: "Hello, I am a developer!",
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: "Bio must be a string" })
  @MaxLength(500, { message: "Bio cannot exceed 500 characters" })
  bio?: string;

  @ApiPropertyOptional({
    description: "Avatar URL of the user",
    example: "https://example.com/avatar.jpg",
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: "Avatar URL must be a string" })
  @MaxLength(500, { message: "Avatar URL cannot exceed 500 characters" })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: "Whether the user profile is public",
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: "isPublic must be a boolean" })
  isPublic?: boolean;
}
