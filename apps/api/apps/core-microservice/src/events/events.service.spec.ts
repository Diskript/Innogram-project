import { Test, TestingModule } from "@nestjs/testing";
import { EventsService } from "./events.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

describe("EventsService", () => {
  let service: EventsService;

  const mockEmit = jest.fn();
  const mockOn = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: EventEmitter2,
          useValue: { emit: mockEmit, on: mockOn },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should emit an event", () => {
    const payload = { userId: "u1", type: "LIKE" };
    service.emit("notification.created", payload);
    expect(mockEmit).toHaveBeenCalledWith("notification.created", payload);
  });

  it("should register a listener", () => {
    const listener = jest.fn();
    service.on("notification.created", listener);
    expect(mockOn).toHaveBeenCalledWith("notification.created", listener);
  });
});
