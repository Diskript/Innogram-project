import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ConversationResponse {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty()
  isGroup!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  participants!: ParticipantInfo[];

  @ApiPropertyOptional()
  lastMessage?: MessageBrief;
}

export class ParticipantInfo {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  joinedAt!: Date;

  @ApiPropertyOptional()
  leftAt?: Date;

  @ApiProperty()
  user!: {
    id: string;
    userName: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export class MessageBrief {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  senderId!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  createdAt!: Date;
}
