import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class QueryFeedDto {
  @ApiPropertyOptional({
    description: "Cursor for pagination (last post ID from previous page)",
    example: "uuid-string",
  })
  @IsOptional()
  @IsString({ message: "Cursor must be a string" })
  cursor?: string;

  @ApiPropertyOptional({
    description: "Number of records to take",
    example: 20,
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "Take must be a number" })
  @Min(1, { message: "Take must be at least 1" })
  take?: number = 20;
}
