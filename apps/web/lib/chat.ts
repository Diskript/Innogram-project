import { api } from "@/lib/api-client";
import type { UploadedAsset } from "@/lib/posts";

export interface ChatParticipant {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  leftAt: string | null;
  user: {
    id: string;
    userName: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface ChatMessageAsset {
  id: string;
  assetId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  thumbnailPath: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  sender: ChatParticipant["user"];
  assets: ChatMessageAsset[];
}

export interface ChatConversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  participants: ChatParticipant[];
  lastMessage?: {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
  };
}

export interface ChatUser {
  id: string;
  userName: string;
  displayName: string;
  avatarUrl: string | null;
}

export function createConversation(input: {
  name?: string;
  isGroup?: boolean;
  participantIds: string[];
}): Promise<ChatConversation> {
  return api.post<ChatConversation>("/chat/conversations", input);
}

export function getConversations(params?: {
  skip?: number;
  take?: number;
}): Promise<{
  data: ChatConversation[];
  total: number;
  skip: number;
  take: number;
}> {
  const query: Record<string, string> = {};
  if (params?.skip !== undefined) query.skip = String(params.skip);
  if (params?.take !== undefined) query.take = String(params.take);
  return api.get(
    "/chat/conversations",
    Object.keys(query).length ? query : undefined,
  );
}

export function getConversation(id: string): Promise<ChatConversation> {
  return api.get<ChatConversation>(`/chat/conversations/${id}`);
}

export function getMessages(
  id: string,
  params?: { skip?: number; take?: number },
): Promise<{
  data: ChatMessage[];
  total: number;
  skip: number;
  take: number;
}> {
  const query: Record<string, string> = {};
  if (params?.skip !== undefined) query.skip = String(params.skip);
  if (params?.take !== undefined) query.take = String(params.take);
  return api.get(
    `/chat/conversations/${id}/messages`,
    Object.keys(query).length ? query : undefined,
  );
}

export function sendMessage(
  id: string,
  input: { content?: string; assetIds?: string[] },
): Promise<ChatMessage> {
  return api.post<ChatMessage>(`/chat/conversations/${id}/messages`, input);
}

export function editMessage(
  messageId: string,
  content: string,
): Promise<ChatMessage> {
  return api.patch<ChatMessage>(`/chat/messages/${messageId}`, { content });
}

export function deleteMessage(messageId: string): Promise<{ success: true }> {
  return api.delete(`/chat/messages/${messageId}`);
}

export function addParticipants(
  conversationId: string,
  userIds: string[],
): Promise<ChatConversation> {
  return api.post<ChatConversation>(
    `/chat/conversations/${conversationId}/participants`,
    { userIds },
  );
}

export function removeParticipant(
  conversationId: string,
  userId: string,
): Promise<{ success: true }> {
  return api.delete(
    `/chat/conversations/${conversationId}/participants/${userId}`,
  );
}

export function deleteConversation(
  conversationId: string,
): Promise<{ success: true }> {
  return api.delete(`/chat/conversations/${conversationId}`);
}

export function markConversationRead(
  conversationId: string,
): Promise<{ success: true }> {
  return api.post(`/chat/conversations/${conversationId}/read`);
}

export interface ChatUploadedAsset extends UploadedAsset {
  fileName: string;
}

export function uploadChatAttachments(
  files: File[],
): Promise<ChatUploadedAsset[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  formData.append("visibility", "PRIVATE");
  return api.upload<ChatUploadedAsset[]>("/assets/upload/multiple", formData);
}
