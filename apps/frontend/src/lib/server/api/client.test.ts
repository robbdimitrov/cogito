import { describe, it, expect, vi } from "vitest";
import { apiClient } from "./client";

function makeFetchMock(): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
}

function makeEvent(
  fetchMock: ReturnType<typeof vi.fn>,
  session?: string,
  clientAddress?: string,
) {
  const cookies = { get: vi.fn().mockReturnValue(session) };
  const getClientAddress = clientAddress
    ? vi.fn().mockReturnValue(clientAddress)
    : undefined;
  return {
    cookies,
    getClientAddress,
    fetch: fetchMock,
  } as unknown as Parameters<typeof apiClient>[0];
}

describe("apiClient", () => {
  it("forwards the real client address when the caller supplies getClientAddress", async () => {
    const fetchMock = makeFetchMock();
    const event = makeEvent(fetchMock, undefined, "203.0.113.7");
    await apiClient(event)("/sessions", { method: "POST" });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(new Headers(init.headers).get("x-forwarded-for")).toBe(
      "203.0.113.7",
    );
  });

  it("omits x-forwarded-for when the caller has no getClientAddress", async () => {
    const fetchMock = makeFetchMock();
    const event = makeEvent(fetchMock);
    await apiClient(event)("/posts");
    const [, init] = fetchMock.mock.calls[0]!;
    expect(new Headers(init.headers).has("x-forwarded-for")).toBe(false);
  });

  it("logs and does not fail the request when getClientAddress throws", async () => {
    const fetchMock = makeFetchMock();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const event = {
      cookies: { get: vi.fn().mockReturnValue(undefined) },
      getClientAddress: vi.fn().mockImplementation(() => {
        throw new Error(
          "ADDRESS_HEADER was specified but is absent from request",
        );
      }),
      fetch: fetchMock,
    } as unknown as Parameters<typeof apiClient>[0];

    const res = await apiClient(event)("/sessions", { method: "POST" });

    expect(res.status).toBe(204);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(new Headers(init.headers).has("x-forwarded-for")).toBe(false);
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
