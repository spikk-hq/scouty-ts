import { ScoutyError } from "./errors";
import {
  safeSearchValues,
  textSearchBackends,
  textTimeLimitValues,
  type SafeSearch,
  type SerializedTextSearchRequest,
  type TextSearchBackend,
  type TextSearchParams,
  type TextTimeLimit,
} from "./types";

const textBackendSet = new Set<string>(textSearchBackends);
const safeSearchSet = new Set<string>(safeSearchValues);
const textTimeLimitSet = new Set<string>(textTimeLimitValues);

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new ScoutyError(`${fieldName} must not be blank`, {
      code: "validation",
    });
  }

  return normalized;
}

function normalizeOptionalString(
  value: string | undefined,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new ScoutyError(`${fieldName} must not be blank`, {
      code: "validation",
    });
  }

  return normalized;
}

function assertPositiveInteger(
  value: number | undefined,
  fieldName: string,
  max?: number,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new ScoutyError(`${fieldName} must be a positive integer`, {
      code: "validation",
    });
  }

  if (max !== undefined && value > max) {
    throw new ScoutyError(`${fieldName} must be less than or equal to ${max}`, {
      code: "validation",
    });
  }

  return value;
}

function assertAllowedValue<T extends string>(
  value: T | undefined,
  fieldName: string,
  allowed: ReadonlySet<string>,
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!allowed.has(value)) {
    throw new ScoutyError(`Unsupported ${fieldName}: ${value}`, {
      code: "validation",
    });
  }

  return value;
}

export function serializeTextBackend(
  backend: TextSearchBackend | readonly TextSearchBackend[] | undefined,
): string | undefined {
  if (backend === undefined) {
    return undefined;
  }

  const entries = (Array.isArray(backend) ? backend : [backend])
    .map((entry) => String(entry).trim().toLowerCase())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new ScoutyError("backend must not be empty", {
      code: "validation",
    });
  }

  const uniqueEntries = new Set(entries);

  if (uniqueEntries.size !== entries.length) {
    throw new ScoutyError("backend must not contain duplicate engines", {
      code: "validation",
    });
  }

  const invalidEntry = entries.find((entry) => !textBackendSet.has(entry));

  if (invalidEntry) {
    throw new ScoutyError(`Unsupported text backend: ${invalidEntry}`, {
      code: "validation",
    });
  }

  if (entries.includes("auto") && entries.length > 1) {
    throw new ScoutyError('backend "auto" cannot be combined with other engines', {
      code: "validation",
    });
  }

  return entries.join(",");
}

export function serializeTextSearchParams(
  params: TextSearchParams,
): SerializedTextSearchRequest {
  const query = normalizeRequiredString(params.query, "query");
  const region = normalizeOptionalString(params.region, "region")?.toLowerCase();
  const safesearch = assertAllowedValue<SafeSearch>(
    params.safesearch,
    "safesearch",
    safeSearchSet,
  );
  const timelimit = assertAllowedValue<TextTimeLimit>(
    params.timelimit,
    "timelimit",
    textTimeLimitSet,
  );
  const maxResults = assertPositiveInteger(params.maxResults, "maxResults", 100);
  const page = assertPositiveInteger(params.page, "page");
  const backend = serializeTextBackend(params.backend);

  const serialized: SerializedTextSearchRequest = {
    query,
  };

  if (region !== undefined) {
    serialized.region = region;
  }

  if (safesearch !== undefined) {
    serialized.safesearch = safesearch;
  }

  if (timelimit !== undefined) {
    serialized.timelimit = timelimit;
  }

  if (maxResults !== undefined) {
    serialized.max_results = maxResults;
  }

  if (page !== undefined) {
    serialized.page = page;
  }

  if (backend !== undefined) {
    serialized.backend = backend;
  }

  return serialized;
}
