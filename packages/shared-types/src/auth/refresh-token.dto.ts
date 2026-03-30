import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({ example: "refresh-token-id", description: "Refresh token ID" })
  @IsString({ message: "Refresh token ID must be a string" })
  @IsNotEmpty({ message: "Refresh token ID is required" })
  refreshTokenId!: string;
}
