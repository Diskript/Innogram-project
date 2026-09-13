import { createTestApp } from "./helpers/create-test-app";
import { makeAssetRow, TEST_USER_ID } from "./helpers/fixtures";
import { ThumbnailService } from "../src/assets/thumbnail.service";
import { UPLOAD_ROOT } from "../src/assets/file.service";
import * as fs from "fs/promises";
import type { INestApplication } from "@nestjs/common";
import type { PrismaServiceMock } from "./helpers/create-prisma-mock";

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

jest.mock("fs/promises", () => ({
  ...(jest.requireActual("fs/promises") as object),
  rename: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

const ASSET_ID = "66666666-6666-7666-8666-666666666666";
const MISSING_ID = "99999999-9999-7999-8999-999999999999";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

describe("Assets (integration)", () => {
  let app: INestApplication;
  let request: TestApp["request"];
  let prisma: PrismaServiceMock;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    request = testApp.request;
    prisma = testApp.prisma;

    const thumbnailStub = {
      generateImageThumbnail: jest.fn().mockResolvedValue({
        thumbnailPath: "public/thumbnail/t.png",
        mediumPath: "public/medium/m.png",
        width: 800,
        height: 600,
      }),
      generateVideoThumbnail: jest.fn().mockResolvedValue({
        thumbnailPath: "public/thumbnail/t.png",
        width: 800,
        height: 600,
        duration: 5,
      }),
    };
    const thumbnailService = testApp.app.get(ThumbnailService, {
      strict: false,
    });
    for (const [key, value] of Object.entries(thumbnailStub)) {
      // @ts-expect-error test-only override of a private service surface
      thumbnailService[key] = value;
    }
  }, 30000);

  afterAll(async () => {
    await app.close();
    // Disk-staged uploads leave real files behind (rename is mocked, so
    // they never reach their final paths) — clean the uploads tree.
    await fs.rm(UPLOAD_ROOT, { recursive: true, force: true });
  }, 30000);

  afterEach(() => {
    jest.clearAllMocks();
  });

  const imageFile = {
    fieldname: "file",
    originalname: "photo.png",
    mimetype: "image/png",
    size: 1024,
    buffer: Buffer.from("png-data"),
  } as unknown as Express.Multer.File;

  describe("POST /assets/upload", () => {
    it("uploads an image and returns the mapped DTO (201)", async () => {
      prisma.client.asset.create.mockResolvedValue(
        makeAssetRow({
          id: ASSET_ID,
          thumbnailPath: "public/thumbnail/t.png",
          mediumPath: "public/medium/m.png",
        }),
      );

      const res = await request
        .post("/assets/upload")
        .field("visibility", "PUBLIC")
        .attach("file", Buffer.alloc(1024, "a"), {
          filename: "photo.png",
          contentType: "image/png",
        })
        .expect(201);

      expect(res.body.id).toBe(ASSET_ID);
      expect(res.body.url).toBe(`/assets/${ASSET_ID}/download`);
      expect(res.body.thumbnailUrl).toBe(`/assets/${ASSET_ID}/thumbnail`);
      expect(prisma.client.asset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: TEST_USER_ID,
            fileType: "image/png",
            fileSize: 1024,
            visibility: "PUBLIC",
            tags: [],
          }),
        }),
      );
    });

    it("generates thumbnails through the thumbnail service", async () => {
      prisma.client.asset.create.mockResolvedValue(makeAssetRow());

      await request
        .post("/assets/upload")
        .field("visibility", "PUBLIC")
        .attach("file", Buffer.alloc(512, "b"), {
          filename: "photo.png",
          contentType: "image/png",
        })
        .expect(201);

      expect(prisma.client.asset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            thumbnailPath: "public/thumbnail/t.png",
            mediumPath: "public/medium/m.png",
            width: 800,
            height: 600,
            fileSize: 512,
          }),
        }),
      );
    });

    it("converts an unsupported file type into a 400 from the multer filter", async () => {
      // Task 18 moved the type check into the upload interceptor's
      // fileFilter: unsupported types never reach the controller or the
      // (mocked) prisma layer.
      await request
        .post("/assets/upload")
        .field("visibility", "PUBLIC")
        .attach("file", Buffer.from("not an image"), {
          filename: "notes.txt",
          contentType: "text/plain",
        })
        .expect(400);
      expect(prisma.client.asset.create).not.toHaveBeenCalled();
    });

    it("rejects more than 10 files in a single request with 400", async () => {
      let req = request
        .post("/assets/upload/multiple")
        .field("visibility", "PUBLIC");
      for (let i = 0; i < 11; i++) {
        req = req.attach("files", Buffer.alloc(8, "x"), {
          filename: `f${i}.png`,
          contentType: "image/png",
        });
      }

      await req.expect(400);
      expect(prisma.client.asset.create).not.toHaveBeenCalled();
    });
  });

  describe("POST /assets/upload/multiple", () => {
    it("uploads several files (201)", async () => {
      prisma.client.asset.create
        .mockResolvedValueOnce(makeAssetRow({ id: ASSET_ID }))
        .mockResolvedValueOnce(
          makeAssetRow({ id: "88888888-8888-7888-8888-888888888888" }),
        );

      const res = await request
        .post("/assets/upload/multiple")
        .field("visibility", "PUBLIC")
        .attach("files", Buffer.alloc(64, "a"), {
          filename: "a.png",
          contentType: "image/png",
        })
        .attach("files", Buffer.alloc(64, "b"), {
          filename: "b.png",
          contentType: "image/png",
        })
        .expect(201);

      expect(res.body).toHaveLength(2);
      expect(prisma.client.asset.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("GET /assets/:id", () => {
    it("returns an accessible asset (200)", async () => {
      prisma.client.asset.findUnique.mockResolvedValue(
        makeAssetRow({ id: ASSET_ID, ownerId: TEST_USER_ID }),
      );
      prisma.client.asset.findFirst.mockResolvedValue({ id: ASSET_ID });

      const res = await request.get(`/assets/${ASSET_ID}`).expect(200);

      expect(res.body.id).toBe(ASSET_ID);
      expect(res.body.url).toBe(`/assets/${ASSET_ID}/download`);
    });

    it("returns 404 for an unknown asset", async () => {
      prisma.client.asset.findUnique.mockResolvedValue(null);
      await request.get(`/assets/${MISSING_ID}`).expect(404);
    });

    it("returns 403 for a private asset owned by someone else", async () => {
      prisma.client.asset.findUnique.mockResolvedValue(
        makeAssetRow({ ownerId: OTHER_ID, visibility: "PRIVATE" }),
      );
      prisma.client.asset.findFirst.mockResolvedValue(null);

      await request.get(`/assets/${ASSET_ID}`).expect(403);
    });
  });

  describe("PATCH /assets/:id", () => {
    it("updates an own asset's metadata (200)", async () => {
      prisma.client.asset.findUnique.mockResolvedValue(
        makeAssetRow({ ownerId: TEST_USER_ID }),
      );
      prisma.client.asset.update.mockResolvedValue(
        makeAssetRow({ ownerId: TEST_USER_ID, title: "Renamed" }),
      );

      const res = await request
        .patch(`/assets/${ASSET_ID}`)
        .send({ title: "Renamed" })
        .expect(200);

      expect(res.body.title).toBe("Renamed");
    });

    it("forbids updating someone else's asset (403)", async () => {
      prisma.client.asset.findUnique.mockResolvedValue(
        makeAssetRow({ ownerId: OTHER_ID }),
      );

      await request
        .patch(`/assets/${ASSET_ID}`)
        .send({ title: "hijack" })
        .expect(403);
      expect(prisma.client.asset.update).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /assets/:id", () => {
    it("deletes an own asset and its files (200)", async () => {
      prisma.client.asset.findUnique.mockResolvedValue(
        makeAssetRow({
          id: ASSET_ID,
          ownerId: TEST_USER_ID,
          thumbnailPath: "public/thumbnail/t.png",
          mediumPath: "public/medium/m.png",
        }),
      );
      prisma.client.asset.delete.mockResolvedValue(
        makeAssetRow({ ownerId: TEST_USER_ID }),
      );

      const res = await request.delete(`/assets/${ASSET_ID}`).expect(200);

      expect(res.body).toEqual({ success: true });
      expect(prisma.client.asset.delete).toHaveBeenCalledWith({
        where: { id: ASSET_ID },
      });
    });

    it("forbids deleting someone else's asset (403)", async () => {
      prisma.client.asset.findUnique.mockResolvedValue(
        makeAssetRow({ ownerId: OTHER_ID }),
      );

      await request.delete(`/assets/${ASSET_ID}`).expect(403);
      expect(prisma.client.asset.delete).not.toHaveBeenCalled();
    });
  });
});
