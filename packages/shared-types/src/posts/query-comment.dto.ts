import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class QueryCommentDto {
  @ApiPropertyOptional({
    description: "Cursor for pagination (last comment ID from previous page)",
    example: "uuid-string",
  })
  @IsOptional()
  @IsString({ message: "Cursor must be a string" })
  cursor?: string;

  @ApiPropertyOptional({
    description: "Number of records to skip",
    example: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: "Skip must be a number" })
  @Type(() => Number)
  skip?: number;

  @ApiPropertyOptional({
    description: "Number of records to take",
    example: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: "Take must be a number" })
  @Type(() => Number)
  take?: number;
}
