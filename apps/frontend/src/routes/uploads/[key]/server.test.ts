import { describe, expect, it, vi, beforeEach } from "vitest";
import { isHttpError } from "@sveltejs/kit";
import { GET } from "./+server";

type UploadsRequestEvent = Parameters<typeof GET>[0];

const fetchMock = vi.fn();

function makeEvent(key: string, search = ""): UploadsRequestEvent {
  return {
    params: { key },
    url: new URL(`http://localhost/uploads/${key}${search}`),
    fetch: fetchMock,
  } as unknown as UploadsRequestEvent;
}

describe("uploads proxy route", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(new Blob(["data"]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );
  });

  it("forwards a plain key with no query string", async () => {
    await GET(makeEvent("abc123.jpg"));
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/uploads/abc123.jpg",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("forwards ?size=thumb to the backend", async () => {
    await GET(makeEvent("abc123.jpg", "?size=thumb"));
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/uploads/abc123.jpg?size=thumb",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("rejects an unrecognized size value before calling the backend", async () => {
    await expect(GET(makeEvent("abc123.jpg", "?size=huge"))).rejects.toSatisfy(
      (e) => isHttpError(e) && e.status === 400,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a traversal key before calling the backend", async () => {
    await expect(GET(makeEvent("../etc/passwd"))).rejects.toSatisfy(
      (e) => isHttpError(e) && e.status === 404,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
