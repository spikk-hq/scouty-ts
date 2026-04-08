function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function getProcessEnv(name: string): string | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }

  return normalizeOptionalString(process.env?.[name]);
}

export function resolveApiKey(explicitApiKey?: string): string | undefined {
  return normalizeOptionalString(explicitApiKey) ?? getProcessEnv("SCOUTY_API_KEY");
}

export function resolveBaseUrl(explicitBaseUrl?: string): string | undefined {
  return normalizeOptionalString(explicitBaseUrl) ?? getProcessEnv("SCOUTY_BASE_URL");
}
