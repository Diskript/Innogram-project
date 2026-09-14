import { BadRequestException } from "@nestjs/common";
import { Visibility } from "@repo/shared-types";
import * as fs from "fs/promises";
import { join } from "path";
import { FileService, UPLOAD_ROOT } from "./file.service";

const actualFs = jest.requireActual("fs/promises") as typeof fs;

jest.mock("fs/promises", () => {
  const actual = jest.requireActual("fs/promises");
  return {
    ...actual,
    rename: jest.fn(),
    copyFile: jest.fn(),
  };
});

describe("FileService", () => {
  let service: FileService;

  const user = {
    userId: "user-1",
    userName: "user1",
    email: "a@b.c",
  } as never as Parameters<FileService["saveFile"]>[1];

  beforeEach(() => {
    service = new FileService();
    jest.mocked(fs.rename).mockImplementation(actualFs.rename);
    jest.mocked(fs.copyFile).mockImplementation(actualFs.copyFile);
  });

  describe("saveFile (disk-staged flow)", () => {
    it("moves the staged file to the visibility-scoped final path", async () => {
      const stagedPath = join(
        UPLOAD_ROOT,
        "staging",
        "original",
        "staged-probe.png",
      );
      await fs.mkdir(join(stagedPath, ".."), { recursive: true });
      await fs.writeFile(stagedPath, "png-bytes");

      const file = {
        path: stagedPath,
        mimetype: "image/png",
        originalname: "probe.png",
        size: 8,
      } as unknown as Express.Multer.File;

      const result = await service.saveFile(file, user, Visibility.PUBLIC);

      expect(result.fileName).toMatch(/\.png$/);
      expect(result.filePath).toMatch(
        /^public\/users\/user-1\/\d{4}\/\d{2}\/\d{2}\/original\/[^/]+\.png$/,
      );

      const finalAbs = join(UPLOAD_ROOT, result.filePath);
      expect(await fs.readFile(finalAbs, "utf8")).toBe("png-bytes");
      await expect(fs.access(stagedPath)).rejects.toThrow();

      await fs.rm(join(finalAbs, "..", "..", "..", "..", ".."), {
        recursive: true,
        force: true,
      });
      await fs.rm(join(UPLOAD_ROOT, "staging"), {
        recursive: true,
        force: true,
      });
    });

    it("falls back to copy+rm when the move crosses devices (EXDEV)", async () => {
      const stagedPath = join(
        UPLOAD_ROOT,
        "staging",
        "original",
        "exdev-probe.png",
      );
      await fs.mkdir(join(stagedPath, ".."), { recursive: true });
      await fs.writeFile(stagedPath, "png-bytes");

      const file = {
        path: stagedPath,
        mimetype: "image/png",
        originalname: "probe.png",
        size: 8,
      } as unknown as Express.Multer.File;

      const renameSpy = jest.mocked(fs.rename);
      const copyFileSpy = jest.mocked(fs.copyFile);
      renameSpy.mockRejectedValueOnce(
        Object.assign(new Error("cross-device"), { code: "EXDEV" }),
      );

      const result = await service.saveFile(file, user, Visibility.PUBLIC);

      expect(copyFileSpy).toHaveBeenCalled();
      expect(await fs.readFile(join(UPLOAD_ROOT, result.filePath))).toEqual(
        Buffer.from("png-bytes"),
      );

      renameSpy.mockRestore();
      copyFileSpy.mockRestore();
      await fs.rm(join(UPLOAD_ROOT, result.filePath), { force: true });
      await fs.rm(join(UPLOAD_ROOT, "staging"), {
        recursive: true,
        force: true,
      });
    });

    it("fails with 500 when the staged path is missing (no multer file)", async () => {
      const file = {
        mimetype: "image/png",
        originalname: "probe.png",
        size: 1,
      } as unknown as Express.Multer.File;

      await expect(
        service.saveFile(file, user, Visibility.PUBLIC),
      ).rejects.toMatchObject({ status: 500 });
    });

    it("rejects oversized images with 400 before touching the disk", async () => {
      const file = {
        path: "/does/not/matter.png",
        mimetype: "image/png",
        originalname: "big.png",
        size: 11 * 1024 * 1024,
      } as unknown as Express.Multer.File;

      await expect(
        service.saveFile(file, user, Visibility.PUBLIC),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
