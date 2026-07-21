import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class AssetDto {
  @ApiProperty({
    description: "The name of the file",
    example: "photo.jpg",
  })
  @IsNotEmpty({ message: "File name is required" })
  @IsString({ message: "File name must be a string" })
  fileName!: string;

  @ApiProperty({
    description: "The path where the file is stored",
    example: "/uploads/photo.jpg",
  })
  @IsNotEmpty({ message: "File path is required" })
  @IsString({ message: "File path must be a string" })
  filePath!: string;

  @ApiProperty({
    description: "The MIME type of the file",
    example: "image/jpeg",
  })
  @IsNotEmpty({ message: "File type is required" })
  @IsString({ message: "File type must be a string" })
  fileType!: string;

  @ApiProperty({
    description: "The size of the file in bytes",
    example: 102400,
    minimum: 0,
  })
  @IsNotEmpty({ message: "File size is required" })
  @IsNumber({}, { message: "File size must be a number" })
  @Min(0, { message: "File size cannot be negative" })
  fileSize!: number;

  @ApiPropertyOptional({
    description: "The order index for sorting assets",
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: "Order index must be a number" })
  @Min(0, { message: "Order index cannot be negative" })
  orderIndex?: number;
}
