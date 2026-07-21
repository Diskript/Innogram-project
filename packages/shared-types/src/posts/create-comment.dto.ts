import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateCommentDto {
  @ApiProperty({
    description: "The ID of the post this comment belongs to",
    example: "0192c7b0-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
  })
  @IsNotEmpty({ message: "Post ID is required" })
  @IsUUID("7", { message: "Post ID must be a valid UUID" })
  postId!: string;

  @ApiProperty({
    description: "The content of the comment",
    example: "This is a great post!",
  })
  @IsNotEmpty({ message: "Comment content is required" })
  @IsString({ message: "Comment content must be a string" })
  content!: string;

  @ApiPropertyOptional({
    description: "The parent comment ID if this is a reply",
    example: "0192c7b0-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
  })
  @IsOptional()
  @IsUUID("7", { message: "Parent comment ID must be a valid UUID" })
  parentCommentId?: string;
}
