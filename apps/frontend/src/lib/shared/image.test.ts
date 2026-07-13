import { describe, it, expect, vi, beforeEach } from "vitest";
import { resizeImageForUpload } from "./image";

const LARGE = "a".repeat(2000 * 1024); // 2 MB — always triggers compression path
const SMALL = "a".repeat(100 * 1024); // 100 KB — always below the 900 KB limit

function mockImage(
  width: number,
  height: number,
  fires: "load" | "error" = "load",
) {
  global.Image = class {
    onload: () => void = () => {};
    onerror: () => void = () => {};
    width = width;
    height = height;
    _src = "";
    set src(val: string) {
      this._src = val;
      setTimeout(() => (fires === "load" ? this.onload() : this.onerror()), 0);
    }
    get src() {
      return this._src;
    }
  } as unknown as typeof Image;
}

beforeEach(() => {
  vi.restoreAllMocks();

  global.URL.createObjectURL = vi.fn(() => "mock-url");
  global.URL.revokeObjectURL = vi.fn();

  mockImage(2000, 1000);

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: "",
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  // Blob size = canvas area × quality so the mock mirrors compression behaviour.
  // 1600×800 at quality 0.88 → ~1 126 400 bytes (> 900 KB limit), so the
  // implementation steps quality down until the result fits.
  HTMLCanvasElement.prototype.toBlob = vi.fn(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
    _type?: string,
    quality?: number,
  ) {
    const blobSize = this.width * this.height * (quality ?? 1);
    const blob = new Blob([""], { type: "image/jpeg" });
    Object.defineProperty(blob, "size", { value: blobSize });
    setTimeout(() => callback(blob), 0);
  });
});

describe("resizeImageForUpload", () => {
  describe("type validation", () => {
    it("rejects unsupported formats", async () => {
      const file = new File([""], "test.txt", { type: "text/plain" });
      await expect(resizeImageForUpload(file)).rejects.toThrow(
        "Unsupported image format",
      );
    });

    it.each([
      ["img.jpg", "image/jpeg"],
      ["img.png", "image/png"],
      ["img.gif", "image/gif"],
      ["img.webp", "image/webp"],
    ] as const)("accepts %s", async (name, type) => {
      const file = new File([SMALL], name, { type });
      await expect(resizeImageForUpload(file)).resolves.toBe(file);
    });
  });

  describe("passthrough (file ≤ 900 KB)", () => {
    it("returns the original file unchanged", async () => {
      const file = new File([SMALL], "test.jpg", { type: "image/jpeg" });
      await expect(resizeImageForUpload(file)).resolves.toBe(file);
    });
  });

  describe("compression (file > 900 KB)", () => {
    it("compresses a large landscape image under the 900 KB limit", async () => {
      const file = new File([LARGE], "large.png", { type: "image/png" });
      const result = await resizeImageForUpload(file);
      expect(result).not.toBe(file);
      expect(result.size).toBeLessThanOrEqual(900 * 1024);
      expect(result.type).toBe("image/jpeg");
    });

    it("compresses a large portrait image (height > width)", async () => {
      mockImage(1000, 2000);
      const file = new File([LARGE], "portrait.jpg", { type: "image/jpeg" });
      const result = await resizeImageForUpload(file);
      expect(result.size).toBeLessThanOrEqual(900 * 1024);
    });

    it("replaces only the extension, preserving a dotted basename", async () => {
      const file = new File([LARGE], "photo.backup.png", { type: "image/png" });
      const result = await resizeImageForUpload(file);
      expect(result.name).toBe("photo.backup.jpeg");
    });

    it("attempts compression at full size before ever checking the 320px floor", async () => {
      mockImage(200, 200);
      const file = new File([LARGE], "small-dimensions.png", {
        type: "image/png",
      });
      const result = await resizeImageForUpload(file);
      expect(result.size).toBeLessThanOrEqual(900 * 1024);
    });
  });

  describe("error handling", () => {
    it("throws when the canvas context is unavailable", async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
      const file = new File([LARGE], "large.jpg", { type: "image/jpeg" });
      await expect(resizeImageForUpload(file)).rejects.toThrow(
        "Failed to get canvas context",
      );
    });

    it("throws when the image fails to load", async () => {
      mockImage(2000, 1000, "error");
      const file = new File([LARGE], "large.jpg", { type: "image/jpeg" });
      await expect(resizeImageForUpload(file)).rejects.toThrow(
        "Failed to load image",
      );
    });

    it("throws once shrinking would fall below the 320px floor and still not fit", async () => {
      HTMLCanvasElement.prototype.toBlob = vi.fn(function (
        this: HTMLCanvasElement,
        callback: BlobCallback,
      ) {
        const blob = new Blob([""], { type: "image/jpeg" });
        Object.defineProperty(blob, "size", { value: 2000 * 1024 });
        setTimeout(() => callback(blob), 0);
      });
      const file = new File([LARGE], "large.jpg", { type: "image/jpeg" });
      await expect(resizeImageForUpload(file)).rejects.toThrow(
        "Image cannot be compressed under 900KB without falling below 320px",
      );
    });
  });
});
