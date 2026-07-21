import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class Comment {
  @ApiProperty({
    description: "The ID of the comment",
    example: "0192c7b0-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
  })
  @IsNotEmpty({ message: "Comment ID is required" })
  @IsUUID("7", { message: "Comment ID must be a valid UUID" })
  id!: string;

  @ApiProperty({
    description: "The ID of the post this comment belongs to",
    example: "0192c7b0-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
  })
  @IsNotEmpty({ message: "Post ID is required" })
  @IsUUID("7", { message: "Post ID must be a valid UUID" })
  postId!: string;

  @ApiProperty({
    description: "The ID of the user who created this comment",
    example: "0192c7b0-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
  })
  @IsNotEmpty({ message: "User ID is required" })
  @IsUUID("7", { message: "User ID must be a valid UUID" })
  userId!: string;

  @ApiPropertyOptional({
    description: "The parent comment if this is a reply",
    type: () => Comment,
  })
  @IsOptional()
  parentComment?: Comment;

  @ApiPropertyOptional({
    description: "Child comments (replies to this comment)",
    type: [Comment],
  })
  @IsOptional()
  @IsArray({ message: "Child comments must be an array" })
  childComments?: Comment[];

  @ApiProperty({
    description: "The content of the comment",
    example: "This is a great post!",
  })
  @IsNotEmpty({ message: "Comment content is required" })
  @IsString({ message: "Comment content must be a string" })
  content!: string;
}
