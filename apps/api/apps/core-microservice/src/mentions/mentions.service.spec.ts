import { Test, TestingModule } from "@nestjs/testing";
import { MentionsService } from "./mentions.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

describe("MentionsService", () => {
  let service: MentionsService;
  let notificationsService: NotificationsService;

  const mockFindMany = jest.fn();
  const mockCreateNotification = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentionsService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              user: { findMany: mockFindMany },
            },
          },
        },
        {
          provide: NotificationsService,
          useValue: { create: mockCreateNotification },
        },
      ],
    }).compile();

    service = module.get<MentionsService>(MentionsService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolveMentionedUsers", () => {
    it("should return empty array for empty input", async () => {
      const result = await service.resolveMentionedUsers([]);
      expect(result).toEqual([]);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it("should find users by username excluding deleted", async () => {
      const mockUsers = [
        { id: "u1", userName: "alice" },
        { id: "u2", userName: "bob" },
      ];
      mockFindMany.mockResolvedValue(mockUsers);

      const result = await service.resolveMentionedUsers(["alice", "bob"]);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userName: { in: ["alice", "bob"] }, deleted: false },
        select: { id: true, userName: true },
      });
      expect(result).toEqual(mockUsers);
    });
  });

  describe("notifyMentionedUsers", () => {
    it("should skip if no mentions in content", async () => {
      await service.notifyMentionedUsers("actor-1", "post-1", "No mentions");
      expect(mockFindMany).not.toHaveBeenCalled();
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it("should create notifications for mentioned users excluding actor", async () => {
      mockFindMany.mockResolvedValue([
        { id: "u1", userName: "alice" },
        { id: "actor-1", userName: "self" },
        { id: "u2", userName: "bob" },
      ]);

      await service.notifyMentionedUsers(
        "actor-1",
        "post-1",
        "Hello @alice and @bob and @self",
      );

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userName: { in: ["alice", "bob", "self"] },
          deleted: false,
        },
        select: { id: true, userName: true },
      });

      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        "u1",
        "actor-1",
        "MENTION",
        "post-1",
      );
      expect(mockCreateNotification).toHaveBeenCalledWith(
        "u2",
        "actor-1",
        "MENTION",
        "post-1",
      );
    });

    it("should skip mentions when no users resolve", async () => {
      mockFindMany.mockResolvedValue([]);

      await service.notifyMentionedUsers(
        "actor-1",
        "post-1",
        "Hello @nonexistent",
      );

      expect(mockCreateNotification).not.toHaveBeenCalled();
    });
  });
});
