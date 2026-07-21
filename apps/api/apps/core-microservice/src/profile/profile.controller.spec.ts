import { Test, TestingModule } from "@nestjs/testing";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { JwtUser } from "@repo/shared-types";

describe("ProfileController", () => {
  let controller: ProfileController;
  let service: ProfileService;

  const mockProfileService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getPublicProfile: jest.fn(),
  };

  const mockUser: JwtUser = { userId: "user-1", email: "test@test.com" };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: mockProfileService }],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET /profile", () => {
    it("should call service.getProfile with current user id", async () => {
      await controller.getProfile(mockUser);
      expect(service.getProfile).toHaveBeenCalledWith(mockUser.userId);
    });
  });

  describe("PATCH /profile", () => {
    it("should call service.updateProfile with user id and dto", async () => {
      const dto = { displayName: "New Name", isPublic: false };
      await controller.updateProfile(dto, mockUser);
      expect(service.updateProfile).toHaveBeenCalledWith(mockUser.userId, dto);
    });
  });

  describe("GET /profile/:username", () => {
    it("should call service.getPublicProfile with username", async () => {
      const username = "testuser";
      await controller.getPublicProfile(username);
      expect(service.getPublicProfile).toHaveBeenCalledWith(username);
    });
  });
});
