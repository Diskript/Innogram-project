import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { CoreMicroserviceModule } from "../src/core-microservice.module";
import { configureCoreApp } from "../src/configure-app";

describe("CoreMicroserviceController (e2e)", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreMicroserviceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureCoreApp(app);
    await app.listen(0);

    const address = app.getHttpServer().address();
    if (!address || typeof address === "string") {
      throw new Error("HTTP server is not listening");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await app.close();
  });

  it("/ (GET) responds", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hello World!");
  });

  it("/nope (GET) returns 404 without hanging", async () => {
    const res = await fetch(`${baseUrl}/nope`);
    expect(res.status).toBe(404);
  });
});
