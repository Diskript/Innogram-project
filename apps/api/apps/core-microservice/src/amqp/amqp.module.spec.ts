import { Test } from "@nestjs/testing";
import { AmqpModule } from "./amqp.module";
import { AmqpService } from "./amqp.service";
import { NotificationPublisher } from "./notification-publisher";
import { NotificationConsumer } from "./notification-consumer";
import { WsGateway } from "../ws/ws.gateway";
import { EventsService } from "../events/events.service";

describe("AmqpModule", () => {
  it("should compile the module", async () => {
    const module = await Test.createTestingModule({
      imports: [AmqpModule],
    })
      .overrideProvider(AmqpService)
      .useValue({ connect: jest.fn() })
      .overrideProvider(NotificationPublisher)
      .useValue({})
      .overrideProvider(NotificationConsumer)
      .useValue({})
      .overrideProvider(WsGateway)
      .useValue({})
      .overrideProvider(EventsService)
      .useValue({ on: jest.fn() })
      .compile();

    expect(module).toBeDefined();
  });
});
