import type { ScoutyErrorCode } from "./types";

export interface ScoutyErrorOptions {
  code: ScoutyErrorCode;
  status?: number;
  body?: unknown;
  cause?: unknown;
}

export class ScoutyError extends Error {
  readonly code: ScoutyErrorCode;
  readonly status?: number;
  readonly body?: unknown;
  override readonly cause?: unknown;

  constructor(message: string, options: ScoutyErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ScoutyError";
    this.code = options.code;

    if (options.status !== undefined) {
      this.status = options.status;
    }

    if (options.body !== undefined) {
      this.body = options.body;
    }

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
