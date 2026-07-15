import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ChatService } from "./chat.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CreateConversationDto,
  CurrentUser,
  JwtUser,
  QueryConversationDto,
  QueryMessageDto,
  SendMessageDto,
  UpdateMessageDto,
  ConversationResponse,
  MessageResponse,
} from "@repo/shared-types";

@ApiTags("Chat")
@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("conversations")
  @ApiOperation({ summary: "Create a new conversation" })
  @ApiResponse({ status: 201, type: ConversationResponse })
  createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.createConversation(dto, user.userId);
  }

  @Get("conversations")
  @ApiOperation({ summary: "List user conversations" })
  @ApiResponse({ status: 200 })
  findConversations(
    @Query() query: QueryConversationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.findUserConversations(user.userId, query);
  }

  @Get("conversations/:id")
  @ApiOperation({ summary: "Get a conversation by ID" })
  @ApiParam({ name: "id", type: String, description: "Conversation UUID" })
  @ApiResponse({ status: 200, type: ConversationResponse })
  @ApiResponse({ status: 404, description: "Conversation not found" })
  getConversation(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.getConversation(id, user.userId);
  }

  @Post("conversations/:id/messages")
  @ApiOperation({ summary: "Send a message in a conversation" })
  @ApiParam({ name: "id", type: String, description: "Conversation UUID" })
  @ApiResponse({ status: 201, type: MessageResponse })
  sendMessage(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.sendMessage(id, dto, user.userId);
  }

  @Get("conversations/:id/messages")
  @ApiOperation({ summary: "Get messages in a conversation" })
  @ApiParam({ name: "id", type: String, description: "Conversation UUID" })
  @ApiResponse({ status: 200 })
  getMessages(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: QueryMessageDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.getMessages(id, user.userId, query);
  }

  @Patch("messages/:id")
  @ApiOperation({ summary: "Update a message" })
  @ApiParam({ name: "id", type: String, description: "Message UUID" })
  @ApiResponse({ status: 200, type: MessageResponse })
  updateMessage(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMessageDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.updateMessage(id, dto, user.userId);
  }

  @Delete("messages/:id")
  @ApiOperation({ summary: "Delete a message" })
  @ApiParam({ name: "id", type: String, description: "Message UUID" })
  @ApiResponse({ status: 200 })
  deleteMessage(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.deleteMessage(id, user.userId);
  }
}
