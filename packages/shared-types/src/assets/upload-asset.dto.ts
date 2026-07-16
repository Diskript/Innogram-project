import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  MaxLength,
} from "class-validator";
import { Visibility } from "./visibility.enum";

export class UploadAssetDto {
  @ApiPropertyOptional({ description: "Asset title", maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: "Asset description", maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: "Tags for the asset", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: "Visibility level", enum: Visibility })
  @IsEnum(Visibility)
  visibility!: Visibility;
}
