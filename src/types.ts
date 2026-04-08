export const textSearchBackends = [
  "auto",
  "bing",
  "brave",
  "duckduckgo",
  "google",
  "grokipedia",
  "mojeek",
  "wikipedia",
  "yahoo",
  "yandex",
] as const;

export const safeSearchValues = ["on", "moderate", "off"] as const;
export const textTimeLimitValues = ["d", "w", "m", "y"] as const;

export type TextSearchBackend = (typeof textSearchBackends)[number];
export type SafeSearch = (typeof safeSearchValues)[number];
export type TextTimeLimit = (typeof textTimeLimitValues)[number];
export type ApiKeyHeader = "x-api-key" | "authorization";
export type ScoutyErrorCode =
  | "config"
  | "validation"
  | "network"
  | "http"
  | "parse";

export interface ScoutyClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: HeadersInit;
  apiKeyHeader?: ApiKeyHeader;
}

export interface TextSearchParams {
  query: string;
  region?: string;
  safesearch?: SafeSearch;
  timelimit?: TextTimeLimit;
  maxResults?: number;
  page?: number;
  backend?: TextSearchBackend | readonly TextSearchBackend[];
}

export interface TextSearchResult {
  title?: string;
  href?: string;
  body?: string;
  [key: string]: unknown;
}

export interface TextSearchResponse {
  results: TextSearchResult[];
}

export interface SerializedTextSearchRequest {
  query: string;
  region?: string;
  safesearch?: SafeSearch;
  timelimit?: TextTimeLimit;
  max_results?: number;
  page?: number;
  backend?: string;
}
