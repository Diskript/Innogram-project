import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, Min } from "class-validator";

export class QueryUserDto {
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
}
