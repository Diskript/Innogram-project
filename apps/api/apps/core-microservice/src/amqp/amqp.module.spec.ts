import { Test } from "@nestjs/testing";
import { AmqpModule } from "./amqp.module";
import { AmqpService } from "./amqp.service";

describe("AmqpModule", () => {
  it("should compile the module", async () => {
    const module = await Test.createTestingModule({
      imports: [AmqpModule],
    })
      .overrideProvider(AmqpService)
      .useValue({ connect: jest.fn() })
      .compile();

    expect(module).toBeDefined();
  });
});
