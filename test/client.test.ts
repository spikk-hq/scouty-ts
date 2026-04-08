import { afterEach, describe, expect, it, vi } from "vitest";
import { ScoutyClient, ScoutyError } from "../src";

const originalApiKey = process.env.SCOUTY_API_KEY;
const originalBaseUrl = process.env.SCOUTY_BASE_URL;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.SCOUTY_API_KEY;
  } else {
    process.env.SCOUTY_API_KEY = originalApiKey;
  }

  if (originalBaseUrl === undefined) {
    delete process.env.SCOUTY_BASE_URL;
  } else {
    process.env.SCOUTY_BASE_URL = originalBaseUrl;
  }

  vi.restoreAllMocks();
});

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function getRequestDetails(fetchMock: ReturnType<typeof vi.fn>) {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    url,
    init,
    headers: new Headers(init.headers),
    body: JSON.parse(String(init.body)) as Record<string, unknown>,
  };
}

describe("ScoutyClient", () => {
  it("uses explicit constructor config before environment variables", async () => {
    process.env.SCOUTY_API_KEY = "env-key";
    process.env.SCOUTY_BASE_URL = "https://env.example";

    const fetchMock = vi.fn(async () => createJsonResponse({ results: [] }));
    const client = new ScoutyClient({
      apiKey: "explicit-key",
      baseUrl: "https://api.example/",
      fetch: fetchMock,
    });

    await client.search.text({ query: "weather" });

    const request = getRequestDetails(fetchMock);
    expect(request.url).toBe("https://api.example/search/text");
    expect(request.headers.get("x-api-key")).toBe("explicit-key");
  });

  it("loads config from SCOUTY_API_KEY and SCOUTY_BASE_URL", async () => {
    process.env.SCOUTY_API_KEY = "env-key";
    process.env.SCOUTY_BASE_URL = "https://env.example";

    const fetchMock = vi.fn(async () => createJsonResponse({ results: [] }));
    const client = new ScoutyClient({ fetch: fetchMock });

    await client.search.text({ query: "weather" });

    const request = getRequestDetails(fetchMock);
    expect(request.url).toBe("https://env.example/search/text");
    expect(request.headers.get("x-api-key")).toBe("env-key");
  });

  it("throws when the API key is missing", () => {
    delete process.env.SCOUTY_API_KEY;
    process.env.SCOUTY_BASE_URL = "https://env.example";

    expect(() => new ScoutyClient({ fetch: vi.fn() as typeof fetch })).toThrowError(
      new ScoutyError(
        "Missing API key. Provide options.apiKey or set SCOUTY_API_KEY.",
        { code: "config" },
      ),
    );
  });

  it("falls back to the project API URL when the base URL is not configured", async () => {
    process.env.SCOUTY_API_KEY = "env-key";
    delete process.env.SCOUTY_BASE_URL;
    const fetchMock = vi.fn(async () => createJsonResponse({ results: [] }));

    const client = new ScoutyClient({ fetch: fetchMock });

    await client.search.text({ query: "weather" });

    const request = getRequestDetails(fetchMock);
    expect(request.url).toBe("https://api.scouty.dev/search/text");
  });

  it("serializes camelCase params and backend arrays to the API payload", async () => {
    const fetchMock = vi.fn(async () => createJsonResponse({ results: [] }));
    const client = new ScoutyClient({
      apiKey: "test-key",
      baseUrl: "https://api.example",
      fetch: fetchMock,
    });

    await client.search.text({
      query: "  weather  ",
      region: " US-EN ",
      safesearch: "moderate",
      timelimit: "d",
      maxResults: 10,
      page: 2,
      backend: ["Google" as never, "brave"],
    });

    const request = getRequestDetails(fetchMock);
    expect(request.body).toEqual({
      query: "weather",
      region: "us-en",
      safesearch: "moderate",
      timelimit: "d",
      max_results: 10,
      page: 2,
      backend: "google,brave",
    });
  });

  it("accepts a single backend value", async () => {
    const fetchMock = vi.fn(async () => createJsonResponse({ results: [] }));
    const client = new ScoutyClient({
      apiKey: "test-key",
      baseUrl: "https://api.example",
      fetch: fetchMock,
    });

    await client.search.text({
      query: "weather",
      backend: "google",
    });

    const request = getRequestDetails(fetchMock);
    expect(request.body.backend).toBe("google");
  });

  it("rejects duplicate engines", async () => {
    const client = new ScoutyClient({
      apiKey: "test-key",
      baseUrl: "https://api.example",
      fetch: vi.fn() as typeof fetch,
    });

    await expect(
      client.search.text({
        query: "weather",
        backend: ["google", "google"],
      }),
    ).rejects.toMatchObject({
      name: "ScoutyError",
      code: "validation",
      message: "backend must not contain duplicate engines",
    });
  });

  it('rejects mixing "auto" with explicit engines', async () => {
    const client = new ScoutyClient({
      apiKey: "test-key",
      baseUrl: "https://api.example",
      fetch: vi.fn() as typeof fetch,
    });

    await expect(
      client.search.text({
        query: "weather",
        backend: ["auto", "google"],
      }),
    ).rejects.toMatchObject({
      name: "ScoutyError",
      code: "validation",
      message: 'backend "auto" cannot be combined with other engines',
    });
  });

  it("uses x-api-key by default", async () => {
    const fetchMock = vi.fn(async () => createJsonResponse({ results: [] }));
    const client = new ScoutyClient({
      apiKey: "test-key",
      baseUrl: "https://api.example",
      fetch: fetchMock,
    });

    await client.search.text({ query: "weather" });

    const request = getRequestDetails(fetchMock);
    expect(request.headers.get("x-api-key")).toBe("test-key");
    expect(request.headers.get("authorization")).toBeNull();
  });

  it("can send the API key as a bearer token", async () => {
    const fetchMock = vi.fn(async () => createJsonResponse({ results: [] }));
    const client = new ScoutyClient({
      apiKey: "test-key",
      baseUrl: "https://api.example",
      fetch: fetchMock,
      apiKeyHeader: "authorization",
    });

    await client.search.text({ query: "weather" });

    const request = getRequestDetails(fetchMock);
    expect(request.headers.get("authorization")).toBe("Bearer test-key");
    expect(request.headers.get("x-api-key")).toBeNull();
  });

  it("returns typed success data while preserving extra result fields", async () => {
    const fetchMock = vi.fn(async () =>
      createJsonResponse({
        results: [
          {
            title: "Weather",
            href: "https://example.com/weather",
            body: "Latest weather report",
            source: "google",
          },
        ],
      }));
    const client = new ScoutyClient({
      apiKey: "test-key",
      baseUrl: "https://api.example",
      fetch: fetchMock,
    });

    await expect(client.search.text({ query: "weather" })).resolves.toEqual({
      results: [
        {
          title: "Weather",
          href: "https://example.com/weather",
          body: "Latest weather report",
          source: "google",
        },
      ],
    });
  });

  it("maps non-2xx responses to ScoutyError", async () => {
    const fetchMock = vi.fn(async () =>
      createJsonResponse(
        { message: "Invalid API key" },
        { status: 401 },
      ));
    const client = new ScoutyClient({
      apiKey: "test-key",
      baseUrl: "https://api.example",
      fetch: fetchMock,
    });

    await expect(client.search.text({ query: "weather" })).rejects.toMatchObject({
      name: "ScoutyError",
      code: "http",
      status: 401,
      message: "Invalid API key",
      body: { message: "Invalid API key" },
    });
  });

  it("maps network failures to ScoutyError", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("connect failed");
    });
    const client = new ScoutyClient({
      apiKey: "test-key",
      baseUrl: "https://api.example",
      fetch: fetchMock,
    });

    await expect(client.search.text({ query: "weather" })).rejects.toMatchObject({
      name: "ScoutyError",
      code: "network",
      message: "Network request failed",
    });
  });

  it("throws a parse error for malformed success payloads", async () => {
    const fetchMock = vi.fn(async () => createJsonResponse({ ok: true }));
    const client = new ScoutyClient({
      apiKey: "test-key",
      baseUrl: "https://api.example",
      fetch: fetchMock,
    });

    await expect(client.search.text({ query: "weather" })).rejects.toMatchObject({
      name: "ScoutyError",
      code: "parse",
      message: "Invalid response body",
      status: 200,
      body: { ok: true },
    });
  });
});
