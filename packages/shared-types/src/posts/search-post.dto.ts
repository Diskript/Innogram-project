import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class SearchPostDto {
  @ApiProperty({ description: "Search query string" })
  @IsString()
  q!: string;

  @ApiPropertyOptional({
    description: "Number of records to skip",
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Skip must be a number" })
  @Min(0, { message: "Skip cannot be negative" })
  skip?: number = 0;

  @ApiPropertyOptional({
    description: "Number of records to take",
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Take must be a number" })
  @Min(1, { message: "Take must be at least 1" })
  take?: number = 20;
}
