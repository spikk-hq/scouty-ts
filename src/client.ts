import { resolveApiKey, resolveBaseUrl } from "./env";
import { ScoutyError } from "./errors";
import { serializeTextSearchParams } from "./serialize";
import type {
  ApiKeyHeader,
  ScoutyClientOptions,
  SerializedTextSearchRequest,
  TextSearchParams,
  TextSearchResponse,
  TextSearchResult,
} from "./types";

interface ResolvedClientConfig {
  apiKey: string;
  baseUrl: string;
  fetch: typeof fetch;
  headers?: HeadersInit | undefined;
  apiKeyHeader: ApiKeyHeader;
}

function normalizeBaseUrl(baseUrl: string): string {
  let url: URL;

  try {
    url = new URL(baseUrl);
  } catch (cause) {
    throw new ScoutyError(`Invalid base URL: ${baseUrl}`, {
      code: "config",
      cause,
    });
  }

  return url.toString().replace(/\/+$/, "");
}

function resolveFetch(fetchOption?: typeof fetch): typeof fetch {
  if (fetchOption) {
    return fetchOption;
  }

  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }

  throw new ScoutyError(
    "Missing fetch implementation. Provide options.fetch or use a runtime with global fetch support.",
    {
      code: "config",
    },
  );
}

function resolveClientConfig(options: ScoutyClientOptions): ResolvedClientConfig {
  const apiKey = resolveApiKey(options.apiKey);

  if (!apiKey) {
    throw new ScoutyError(
      "Missing API key. Provide options.apiKey or set SCOUTY_API_KEY.",
      {
        code: "config",
      },
    );
  }

  const baseUrl = resolveBaseUrl(options.baseUrl);

  if (!baseUrl) {
    throw new ScoutyError(
      "Missing base URL. Provide options.baseUrl or set SCOUTY_BASE_URL.",
      {
        code: "config",
      },
    );
  }

  const config: ResolvedClientConfig = {
    apiKey,
    baseUrl: normalizeBaseUrl(baseUrl),
    fetch: resolveFetch(options.fetch),
    apiKeyHeader: options.apiKeyHeader ?? "x-api-key",
  };

  if (options.headers !== undefined) {
    config.headers = options.headers;
  }

  return config;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTextSearchResult(value: unknown): value is TextSearchResult {
  return isRecord(value);
}

function isTextSearchResponse(value: unknown): value is TextSearchResponse {
  return isRecord(value)
    && Array.isArray(value.results)
    && value.results.every((result) => isTextSearchResult(result));
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  return text ? text : null;
}

function extractErrorMessage(body: unknown, status: number): string {
  if (isRecord(body) && typeof body.message === "string" && body.message.trim()) {
    return body.message;
  }

  if (typeof body === "string" && body.trim()) {
    return body;
  }

  return `Request failed with status ${status}`;
}

function buildUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.replace(/^\/+/, "");
  return new URL(normalizedPath, `${baseUrl}/`).toString();
}

function createHeaders(config: ResolvedClientConfig): Headers {
  const headers = new Headers(config.headers);
  headers.set("content-type", "application/json");

  if (config.apiKeyHeader === "authorization") {
    headers.set("authorization", `Bearer ${config.apiKey}`);
  } else {
    headers.set("x-api-key", config.apiKey);
  }

  return headers;
}

export class ScoutyClient {
  private readonly config: ResolvedClientConfig;

  readonly search: {
    text: (params: TextSearchParams) => Promise<TextSearchResponse>;
  };

  constructor(options: ScoutyClientOptions = {}) {
    this.config = resolveClientConfig(options);
    this.search = {
      text: async (params) => this.textSearch(params),
    };
  }

  private async textSearch(params: TextSearchParams): Promise<TextSearchResponse> {
    const body = serializeTextSearchParams(params);
    return this.post("/search/text", body, isTextSearchResponse);
  }

  private async post<T>(
    path: string,
    body: SerializedTextSearchRequest,
    validate: (value: unknown) => value is T,
  ): Promise<T> {
    let response: Response;

    try {
      response = await this.config.fetch(buildUrl(this.config.baseUrl, path), {
        method: "POST",
        headers: createHeaders(this.config),
        body: JSON.stringify(body),
      });
    } catch (cause) {
      throw new ScoutyError("Network request failed", {
        code: "network",
        cause,
      });
    }

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new ScoutyError(extractErrorMessage(responseBody, response.status), {
        code: "http",
        status: response.status,
        body: responseBody,
      });
    }

    if (!validate(responseBody)) {
      throw new ScoutyError("Invalid response body", {
        code: "parse",
        status: response.status,
        body: responseBody,
      });
    }

    return responseBody;
  }
}
