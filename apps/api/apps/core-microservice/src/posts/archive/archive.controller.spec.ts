import { Test, TestingModule } from "@nestjs/testing";
import { ArchiveController } from "./archive.controller";
import { ArchiveService } from "./archive.service";

describe("ArchiveController", () => {
  let controller: ArchiveController;

  const mockArchiveService = {
    archivePost: jest.fn(),
    unArchive: jest.fn(),
    getArchived: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArchiveController],
      providers: [
        { provide: ArchiveService, useValue: mockArchiveService },
      ],
    }).compile();

    controller = module.get<ArchiveController>(ArchiveController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
