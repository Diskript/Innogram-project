import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AssetDto } from "./assets.dto";

export class AssetsCreationDto {
  @ApiProperty({
    description: "The ID of the post to attach assets to",
    example: 1,
  })
  @IsNotEmpty({ message: "Post ID is required" })
  @IsNumber({}, { message: "Post ID must be a valid number" })
  postId!: number;

  @ApiProperty({
    description: "Array of assets (images/videos) to upload",
    type: [AssetDto],
    example: [
      {
        fileName: "photo.jpg",
        filePath: "/uploads/photo.jpg",
        fileType: "image/jpeg",
        fileSize: 102400,
      },
    ],
  })
  @IsNotEmpty({ message: "Assets array is required" })
  @IsArray({ message: "Assets must be an array" })
  @ValidateNested({ each: true, message: "Each asset must be valid" })
  @Type(() => AssetDto)
  assets!: AssetDto[];

  @ApiPropertyOptional({
    description:
      "Starting index for ordering assets (useful when adding to existing assets)",
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: "Start index must be a number" })
  @Min(0, { message: "Start index cannot be negative" })
  startIndex?: number;
}
