import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ValidateTokenDto {
  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    description: "Access token to validate",
  })
  @IsString({ message: "Token must be a string" })
  @IsNotEmpty({ message: "Token is required" })
  token!: string;
}
