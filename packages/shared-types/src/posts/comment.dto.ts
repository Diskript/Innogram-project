import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class Comment {
  @ApiProperty({
    description: "The ID of the post this comment belongs to",
    example: 1,
  })
  @IsNotEmpty({ message: "Post ID is required" })
  @IsNumber({}, { message: "Post ID must be a number" })
  postId!: number;

  @ApiProperty({
    description: "The ID of the user who created this comment",
    example: 1,
  })
  @IsNotEmpty({ message: "User ID is required" })
  @IsNumber({}, { message: "User ID must be a number" })
  userId!: number;

  @ApiPropertyOptional({
    description: "The parent comment if this is a reply",
    type: () => Comment,
  })
  @IsOptional()
  parrentComment?: Comment;

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
