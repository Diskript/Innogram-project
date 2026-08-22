import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class QueryCommentDto {
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
