import { Test, TestingModule } from "@nestjs/testing";
import { PostsService } from "./posts.service";
import { PrismaService } from "../prisma/prisma.service";
import { MentionsService } from "../mentions/mentions.service";

describe("PostsService", () => {
  let service: PostsService;

  const mockPrismaService = {
    client: {
      post: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    },
  };

  const mockMentionsService = {
    notifyMentionedUsers: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MentionsService, useValue: mockMentionsService },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should include the author (creator) in search results", async () => {
    mockPrismaService.client.post.findMany.mockResolvedValue([]);
    mockPrismaService.client.post.count.mockResolvedValue(0);

    await service.search({ q: "hello", skip: 0, take: 20 });

    const args = mockPrismaService.client.post.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      visibility: "PUBLIC",
      archived: false,
      OR: [
        { content: { contains: "hello", mode: "insensitive" } },
        { tags: { hasSome: ["hello"] } },
      ],
    });
    expect(args.include.creator).toEqual({
      select: { id: true, userName: true, displayName: true, avatarUrl: true },
    });
  });
});
