export interface ParticipantWithUser {
  id: string;
  userId: string;
  role: string;
  joinedAt: Date;
  leftAt: Date | null;
  user: {
    id: string;
    userName: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface MessageBriefRaw {
  id: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

export interface ConversationWithParticipants {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: Date;
  updatedAt: Date;
  participants: ParticipantWithUser[];
  messages?: MessageBriefRaw[];
}

export interface MessageAssetRaw {
  id: string;
  assetId: string;
  asset: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    thumbnailPath: string | null;
  };
}

export interface MessageWithSenderAndAssets {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: string;
    userName: string;
    displayName: string;
    avatarUrl: string | null;
  };
  assets: MessageAssetRaw[];
}
