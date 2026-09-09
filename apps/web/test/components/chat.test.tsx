import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "@/test/mocks/contexts";
import "@/test/mocks/api-client";
import { ApiError, mockApi } from "@/test/mocks/api-client";
import { mockAuth, mockChat } from "@/test/mocks/contexts";
import { mockNavigation, mockNextNavigation } from "@/test/mocks/navigation";
import { renderWithProviders } from "@/test/render-with-providers";
import {
  makeConversation,
  makeMessage,
  makeParticipant,
  makeUser,
  OTHER_USER_ID,
  USER_ID,
} from "@/test/factories";
import { MessageItem } from "@/components/chat/message-item";
import { MessageList } from "@/components/chat/message-list";
import { MessageComposer } from "@/components/chat/message-composer";
import { ConversationList } from "@/components/chat/conversation-list";
import { ConversationHeader } from "@/components/chat/conversation-header";
import { NewChatButton } from "@/components/chat/new-chat-button";
import { NewChatDialog } from "@/components/chat/new-chat-dialog";
import { ParticipantsPanel } from "@/components/chat/participants-panel";
import { ChatShell } from "@/components/chat/chat-shell";
import type { ChatConversation } from "@/lib/chat";
import {
  addParticipants,
  createConversation,
  deleteConversation,
  deleteMessage,
  editMessage,
  getConversation,
  getConversations,
  getMessages,
  removeParticipant,
  sendMessage,
} from "@/lib/chat";

jest.mock("@/lib/chat", () => ({
  sendMessage: jest.fn(),
  uploadChatAttachments: jest.fn(),
  getConversations: jest.fn(),
  getConversation: jest.fn(),
  getMessages: jest.fn(),
  createConversation: jest.fn(),
  deleteConversation: jest.fn(),
  markConversationRead: jest.fn(),
  removeParticipant: jest.fn(),
  addParticipants: jest.fn(),
  editMessage: jest.fn(),
  deleteMessage: jest.fn(),
}));

function twoUserConversation(overrides: Partial<ChatConversation> = {}) {
  const base = makeConversation({
    participants: [
      makeParticipant(),
      makeParticipant({
        id: "participant-2",
        userId: OTHER_USER_ID,
        user: makeUser({
          id: OTHER_USER_ID,
          userName: "otheruser",
          displayName: "Other User",
        }),
      }),
    ],
  });
  return { ...base, ...overrides };
}

describe("chat components", () => {
  beforeEach(() => {
    mockAuth.user = { userId: USER_ID, email: "user@test.local" };
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockAuth.user = { userId: USER_ID, email: "user@test.local" };
    mockChat.totalUnread = 0;
  });

  describe("MessageItem", () => {
    it("renders content with own-message alignment", () => {
      const { container } = renderWithProviders(
        <MessageItem
          message={makeMessage()}
          conversationId="conversation-1"
          compact={false}
        />,
      );
      expect(screen.getByText("Hello there")).toBeInTheDocument();
      expect(container.firstChild).toHaveClass("justify-end");
    });

    it("aligns other users' messages to the start", () => {
      const { container } = renderWithProviders(
        <MessageItem
          message={makeMessage({ senderId: OTHER_USER_ID })}
          conversationId="conversation-1"
          compact={false}
        />,
      );
      expect(container.firstChild).toHaveClass("justify-start");
    });

    it("marks edited messages", () => {
      renderWithProviders(
        <MessageItem
          message={makeMessage({ updatedAt: "2026-01-01T00:05:00.000Z" })}
          conversationId="conversation-1"
          compact={false}
        />,
      );
      expect(screen.getByText("edited")).toBeInTheDocument();
    });

    it("renders file attachment chips", () => {
      renderWithProviders(
        <MessageItem
          message={makeMessage({
            assets: [
              {
                id: "ma-1",
                assetId: "asset-9",
                fileName: "report.pdf",
                fileType: "application/pdf",
                fileSize: 1234,
                thumbnailPath: null,
              },
            ],
          })}
          conversationId="conversation-1"
          compact={false}
        />,
      );
      expect(screen.getByText("report.pdf")).toBeInTheDocument();
    });

    it("copies message text", async () => {
      const user = userEvent.setup();
      const writeText = jest.fn();
      Object.defineProperty(window.navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
      renderWithProviders(
        <MessageItem
          message={makeMessage()}
          conversationId="conversation-1"
          compact={false}
        />,
      );
      await user.click(screen.getByTitle("Copy text"));
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith("Hello there");
      });
    });

    it("edits own messages inline", async () => {
      jest.mocked(editMessage).mockResolvedValue({} as never);
      const user = userEvent.setup();
      renderWithProviders(
        <MessageItem
          message={makeMessage()}
          conversationId="conversation-1"
          compact={false}
        />,
      );
      await user.click(screen.getByTitle("Edit message"));
      const textarea = screen.getByDisplayValue("Hello there");
      await user.type(textarea, " now edited");
      await user.keyboard("{Enter}");
      await waitFor(() => {
        expect(editMessage).toHaveBeenCalledWith(
          "message-1",
          "Hello there now edited",
        );
      });
    });

    it("deletes own messages after confirmation", async () => {
      jest.mocked(deleteMessage).mockResolvedValue({} as never);
      const user = userEvent.setup();
      renderWithProviders(
        <MessageItem
          message={makeMessage()}
          conversationId="conversation-1"
          compact={false}
        />,
      );
      await user.click(screen.getByTitle("Delete message"));
      expect(screen.getByText("Delete message?")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Delete" }));
      await waitFor(() => {
        expect(deleteMessage).toHaveBeenCalledWith("message-1");
      });
    });
  });

  describe("MessageList", () => {
    it("renders the last page of messages in ascending order", async () => {
      const older = makeMessage({
        id: "message-old",
        content: "older message",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      const newer = makeMessage({
        id: "message-new",
        content: "newer message",
        createdAt: "2026-01-01T00:01:00.000Z",
      });
      jest
        .mocked(getMessages)
        .mockResolvedValueOnce({
          data: [newer],
          total: 2,
          skip: 0,
          take: 1,
        })
        .mockResolvedValue({
          data: [older, newer],
          total: 2,
          skip: 1,
          take: 50,
        });

      renderWithProviders(<MessageList conversationId="conversation-1" />);

      await screen.findByText("older message");
      expect(screen.getByText("newer message")).toBeInTheDocument();
      expect(getMessages).toHaveBeenCalledWith("conversation-1", {
        skip: 0,
        take: 1,
      });
      expect(getMessages).toHaveBeenCalledWith("conversation-1", {
        skip: 0,
        take: 50,
      });
    });
  });

  describe("MessageComposer", () => {
    it("disables send while empty", () => {
      renderWithProviders(<MessageComposer conversationId="conversation-1" />);
      expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    });

    it("reports typing while composing", async () => {
      const user = userEvent.setup();
      renderWithProviders(<MessageComposer conversationId="conversation-1" />);
      await user.type(screen.getByPlaceholderText(/Message/), "hi");
      expect(mockChat.markTyping).toHaveBeenCalledWith("conversation-1");
    });

    it("sends on Enter and clears the draft", async () => {
      jest.mocked(sendMessage).mockResolvedValue({} as never);
      const user = userEvent.setup();
      renderWithProviders(<MessageComposer conversationId="conversation-1" />);
      const textarea = screen.getByPlaceholderText(/Message/);
      await user.type(textarea, "hello chat{Enter}");
      await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith("conversation-1", {
          content: "hello chat",
        });
      });
      expect(textarea).toHaveValue("");
    });

    it("sends via the Send button", async () => {
      jest.mocked(sendMessage).mockResolvedValue({} as never);
      const user = userEvent.setup();
      renderWithProviders(<MessageComposer conversationId="conversation-1" />);
      await user.type(screen.getByPlaceholderText(/Message/), "hello");
      await user.click(screen.getByRole("button", { name: "Send" }));
      await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith("conversation-1", {
          content: "hello",
        });
      });
    });
  });

  describe("ConversationList", () => {
    it("shows the empty state without conversations", async () => {
      jest.mocked(getConversations).mockResolvedValue({
        data: [],
        total: 0,
        skip: 0,
        take: 50,
      });
      renderWithProviders(<ConversationList />);
      expect(
        await screen.findByText(/No conversations yet/),
      ).toBeInTheDocument();
      expect(getConversations).toHaveBeenCalledWith({ skip: 0, take: 50 });
    });

    it("renders conversation rows with title and preview", async () => {
      jest.mocked(getConversations).mockResolvedValue({
        data: [
          twoUserConversation({
            lastMessage: {
              id: "m1",
              senderId: USER_ID,
              content: "Hello there",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          }),
        ],
        total: 1,
        skip: 0,
        take: 50,
      });
      renderWithProviders(<ConversationList />);
      expect(await screen.findByText("Other User")).toBeInTheDocument();
      expect(screen.getByText("You: Hello there")).toBeInTheDocument();
    });

    it("navigates to the thread on click", async () => {
      mockNextNavigation("/chat");
      jest.mocked(getConversations).mockResolvedValue({
        data: [twoUserConversation()],
        total: 1,
        skip: 0,
        take: 50,
      });
      const user = userEvent.setup();
      renderWithProviders(<ConversationList />);
      const row = await screen.findByText("Other User");
      await user.click(row);
      expect(mockNavigation.push).toHaveBeenCalledWith("/chat/conversation-1");
    });

    it("shows the unread badge", async () => {
      jest.mocked(getConversations).mockResolvedValue({
        data: [twoUserConversation({ unreadCount: 4 })],
        total: 1,
        skip: 0,
        take: 50,
      });
      renderWithProviders(<ConversationList />);
      expect(await screen.findByText("4")).toBeInTheDocument();
    });
  });

  describe("ConversationHeader", () => {
    it("renders title, presence and members button", async () => {
      jest.mocked(getConversation).mockResolvedValue(twoUserConversation());
      renderWithProviders(
        <ConversationHeader conversationId="conversation-1" />,
      );
      expect(await screen.findByText("Other User")).toBeInTheDocument();
      expect(screen.getByText("offline")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Members/ }),
      ).toBeInTheDocument();
    });

    it("shows typing indicator for other users", async () => {
      mockChat.typingBy = jest.fn(() => [OTHER_USER_ID]);
      jest.mocked(getConversation).mockResolvedValue(twoUserConversation());
      renderWithProviders(
        <ConversationHeader conversationId="conversation-1" />,
      );
      expect(
        await screen.findByText("Other User is typing…"),
      ).toBeInTheDocument();
    });

    it("renders the error state for missing conversations", async () => {
      jest.mocked(getConversation).mockRejectedValue(
        new (ApiError as unknown as new (
          m: string,
          s: number,
        ) => Error & {
          status: number;
        })("nope", 404),
      );
      renderWithProviders(
        <ConversationHeader conversationId="conversation-1" />,
      );
      expect(
        await screen.findByText("Conversation unavailable"),
      ).toBeInTheDocument();
      expect(screen.getByText("Back to chats")).toBeInTheDocument();
    });
  });

  describe("NewChatButton", () => {
    it("opens the new chat dialog", async () => {
      const user = userEvent.setup();
      renderWithProviders(<NewChatButton />);
      await user.click(screen.getByRole("button", { name: "New chat" }));
      expect(
        await screen.findByRole("dialog", { name: "New chat" }),
      ).toBeInTheDocument();
    });
  });

  describe("NewChatDialog", () => {
    it("searches users, selects one and starts a chat", async () => {
      jest.mocked(mockApi.get).mockResolvedValue({
        data: [
          makeUser({
            id: OTHER_USER_ID,
            userName: "otheruser",
            displayName: "Other User",
          }),
        ],
      } as never);
      jest
        .mocked(createConversation)
        .mockResolvedValue(twoUserConversation() as never);
      const user = userEvent.setup();
      renderWithProviders(
        <NewChatDialog open={true} onOpenChange={() => {}} />,
      );
      await user.type(screen.getByPlaceholderText(/Search people/), "other");
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith("/users/search", {
          q: "other",
        });
      });
      const result = await screen.findByText("Other User");
      await user.click(result);
      await user.click(screen.getByRole("button", { name: "Start chat" }));
      await waitFor(() => {
        expect(createConversation).toHaveBeenCalledWith({
          participantIds: [OTHER_USER_ID],
        });
      });
      expect(mockNavigation.push).toHaveBeenCalledWith("/chat/conversation-1");
    });

    it("keeps Start chat disabled without a selection", async () => {
      renderWithProviders(
        <NewChatDialog open={true} onOpenChange={() => {}} />,
      );
      expect(screen.getByText("No people found.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Start chat" })).toBeDisabled();
    });
  });

  describe("ParticipantsPanel", () => {
    it("lists members with badges and remove actions", async () => {
      renderWithProviders(
        <ParticipantsPanel
          conversation={twoUserConversation({
            participants: [
              makeParticipant({ role: "ADMIN" }),
              makeParticipant({
                id: "participant-2",
                userId: OTHER_USER_ID,
                role: "MEMBER",
                user: makeUser({
                  id: OTHER_USER_ID,
                  userName: "otheruser",
                  displayName: "Other User",
                }),
              }),
            ],
          })}
          open={true}
          onOpenChange={() => {}}
        />,
      );
      expect(await screen.findByText(/— 2 members/)).toBeInTheDocument();
      expect(screen.getByText(/Test User \(you\)/)).toBeInTheDocument();
      expect(screen.getByText("ADMIN")).toBeInTheDocument();
      expect(screen.getByText("✕ remove")).toBeInTheDocument();
    });

    it("removes a member after confirmation", async () => {
      jest.mocked(removeParticipant).mockResolvedValue({} as never);
      const user = userEvent.setup();
      renderWithProviders(
        <ParticipantsPanel
          conversation={twoUserConversation({
            participants: [
              makeParticipant({ role: "ADMIN" }),
              makeParticipant({
                id: "participant-2",
                userId: OTHER_USER_ID,
                role: "MEMBER",
                user: makeUser({
                  id: OTHER_USER_ID,
                  userName: "otheruser",
                  displayName: "Other User",
                }),
              }),
            ],
          })}
          open={true}
          onOpenChange={() => {}}
        />,
      );
      await user.click(await screen.findByText("✕ remove"));
      expect(await screen.findByText("Remove Other User?")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Remove" }));
      await waitFor(() => {
        expect(removeParticipant).toHaveBeenCalledWith(
          "conversation-1",
          OTHER_USER_ID,
        );
      });
    });

    it("adds people from search results", async () => {
      jest.mocked(mockApi.get).mockResolvedValue({
        data: [
          makeUser({
            id: OTHER_USER_ID,
            userName: "otheruser",
            displayName: "Other User",
          }),
        ],
      } as never);
      jest.mocked(addParticipants).mockResolvedValue({} as never);
      const user = userEvent.setup();
      renderWithProviders(
        <ParticipantsPanel
          conversation={makeConversation({
            participants: [makeParticipant({ role: "ADMIN" })],
          })}
          open={true}
          onOpenChange={() => {}}
        />,
      );
      await screen.findByText(/— 1 member/);
      await user.type(screen.getByPlaceholderText(/Add people/), "other");
      const result = await screen.findByText("Other User");
      await user.click(result);
      await waitFor(() => {
        expect(addParticipants).toHaveBeenCalledWith("conversation-1", [
          OTHER_USER_ID,
        ]);
      });
    });

    it("offers delete for the sole admin", async () => {
      jest.mocked(deleteConversation).mockResolvedValue({} as never);
      const user = userEvent.setup();
      renderWithProviders(
        <ParticipantsPanel
          conversation={makeConversation({
            participants: [makeParticipant({ role: "ADMIN" })],
          })}
          open={true}
          onOpenChange={() => {}}
        />,
      );
      expect(await screen.findByText(/only admin/)).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: /Delete conversation/ }),
      );
      expect(
        await screen.findByRole("alertdialog", { name: /Delete/ }),
      ).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Delete conversation" }),
      );
      await waitFor(() => {
        expect(deleteConversation).toHaveBeenCalledWith("conversation-1");
      });
    });
  });

  describe("ChatShell", () => {
    it("renders the conversation list and children", async () => {
      mockNextNavigation("/chat");
      jest.mocked(getConversations).mockResolvedValue({
        data: [],
        total: 0,
        skip: 0,
        take: 50,
      });
      renderWithProviders(
        <ChatShell>
          <p>thread area</p>
        </ChatShell>,
      );
      expect(
        await screen.findByText(/No conversations yet/),
      ).toBeInTheDocument();
      expect(screen.getByText("thread area")).toBeInTheDocument();
    });
  });
});
