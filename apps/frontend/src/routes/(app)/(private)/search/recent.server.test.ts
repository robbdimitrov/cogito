import { describe, expect, it, vi, beforeEach } from "vitest";
import { isHttpError } from "@sveltejs/kit";
import { POST } from "./recent/+server";

const { apiCallMock } = vi.hoisted(() => ({
  apiCallMock: vi.fn(),
}));

vi.mock("$lib/server/api/client", () => ({
  apiClient: () => apiCallMock,
}));

vi.mock("$lib/server/api/http", () => ({
  unwrap: vi.fn(async () => null),
}));

type RecentRequestEvent = Parameters<typeof POST>[0];

function makeEvent(
  body: string,
  headers: HeadersInit = {},
): RecentRequestEvent {
  return {
    request: new Request("http://localhost/search/recent", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
    }),
    cookies: { get: () => "session" },
  } as unknown as RecentRequestEvent;
}

describe("search recent route", () => {
  beforeEach(() => {
    apiCallMock.mockReset();
    apiCallMock.mockResolvedValue(new Response(null, { status: 204 }));
  });

  it("trims and forwards a valid recent search", async () => {
    const response = await POST(
      makeEvent(JSON.stringify({ type: " users ", reference: " Alice " })),
    );

    expect(response.status).toBe(204);
    expect(apiCallMock).toHaveBeenCalledWith("/search/recent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "users", reference: "Alice" }),
    });
  });

  it("rejects malformed JSON before calling the API", async () => {
    await expect(POST(makeEvent("{"))).rejects.toSatisfy(
      (e) => isHttpError(e) && e.status === 400,
    );
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies before calling the API", async () => {
    await expect(
      POST(
        makeEvent("{}", {
          "content-length": "1025",
        }),
      ),
    ).rejects.toSatisfy((e) => isHttpError(e) && e.status === 413);
    expect(apiCallMock).not.toHaveBeenCalled();
  });
});
