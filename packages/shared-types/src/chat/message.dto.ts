import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class MessageResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  conversationId!: string;

  @ApiProperty()
  senderId!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  sender!: {
    id: string;
    userName: string;
    displayName: string;
    avatarUrl?: string;
  };

  @ApiPropertyOptional()
  assets?: MessageAssetInfo[];
}

export class MessageAssetInfo {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  assetId!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  fileType!: string;

  @ApiProperty()
  fileSize!: number;

  @ApiPropertyOptional()
  thumbnailPath?: string;

  @ApiProperty()
  mimeType!: string;
}

export class UpdateMessageDto {
  @ApiProperty()
  @IsString()
  content!: string;
}
