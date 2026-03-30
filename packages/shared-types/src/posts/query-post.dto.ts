import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class QueryPostDto {
  @ApiPropertyOptional({
    description: "Number of records to skip",
    example: 0,
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
    example: 10,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Take must be a number" })
  @Min(1, { message: "Take must be at least 1" })
  take?: number = 10;

  @ApiPropertyOptional({
    description: "Filter posts by user ID",
    example: "uuid-string",
  })
  @IsOptional()
  @IsString({ message: "User ID must be a string" })
  @IsUUID(undefined, { message: "User ID must be a valid UUID" })
  userId?: string;
}
