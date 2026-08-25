import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class QueryPostLikesDto {
  @ApiPropertyOptional({ description: "Number of records to skip" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  skip?: number;

  @ApiPropertyOptional({ description: "Number of records to take" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  take?: number;
}
