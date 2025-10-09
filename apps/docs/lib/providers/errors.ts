/**
 * Error Handling Implementation
 *
 * Implements specific error types for Ollama connection failures and timeouts
 * Provides clear error messages for debugging
 */

export class OllamaError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

export class OllamaConnectionError extends OllamaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "OLLAMA_CONNECTION_FAILED", details);
    this.name = "OllamaConnectionError";
  }
}

export class OllamaModelNotFoundError extends OllamaError {
  constructor(model: string, availableModels?: string[]) {
    const message = availableModels
      ? `Model "${model}" not found. Available models: ${availableModels.join(", ")}`
      : `Model "${model}" not found. Run "ollama list" to see available models.`;

    super(message, "OLLAMA_MODEL_NOT_FOUND", { model, availableModels });
    this.name = "OllamaModelNotFoundError";
  }
}

export class OllamaTimeoutError extends OllamaError {
  constructor(timeout: number, suggestion?: string) {
    const message = suggestion
      ? `Ollama request timed out after ${timeout}ms. ${suggestion}`
      : `Ollama request timed out after ${timeout}ms. Consider increasing OLLAMA_TIMEOUT for slower machines.`;

    super(message, "OLLAMA_TIMEOUT", { timeout });
    this.name = "OllamaTimeoutError";
  }
}

export class OllamaRequestError extends OllamaError {
  constructor(
    message: string,
    statusCode?: number,
    details?: Record<string, unknown>,
  ) {
    super(message, "OLLAMA_REQUEST_FAILED", { statusCode, ...details });
    this.name = "OllamaRequestError";
  }
}

export class ProviderUnavailableError extends Error {
  constructor(provider: string, reason?: string) {
    const message = reason
      ? `Provider "${provider}" is unavailable: ${reason}`
      : `Provider "${provider}" is unavailable. Please check your configuration.`;

    super(message);
    this.name = "ProviderUnavailableError";
  }
}

export class InvalidConfigurationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = "InvalidConfigurationError";
  }
}

// Error code constants for consistent error handling
export const ERROR_CODES = {
  OLLAMA_CONNECTION_FAILED: "OLLAMA_CONNECTION_FAILED",
  OLLAMA_MODEL_NOT_FOUND: "OLLAMA_MODEL_NOT_FOUND",
  OLLAMA_TIMEOUT: "OLLAMA_TIMEOUT",
  OLLAMA_REQUEST_FAILED: "OLLAMA_REQUEST_FAILED",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  INVALID_CONFIGURATION: "INVALID_CONFIGURATION",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Error message helpers
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unknown error occurred";
}

export function getErrorCode(error: unknown): ErrorCode | undefined {
  if (error instanceof OllamaError) {
    return error.code as ErrorCode;
  }
  if (error instanceof ProviderUnavailableError) {
    return ERROR_CODES.PROVIDER_UNAVAILABLE;
  }
  if (error instanceof InvalidConfigurationError) {
    return ERROR_CODES.INVALID_CONFIGURATION;
  }
  return undefined;
}

export function isRetryableError(error: unknown): boolean {
  const code = getErrorCode(error);
  return (
    code === ERROR_CODES.OLLAMA_TIMEOUT ||
    code === ERROR_CODES.OLLAMA_CONNECTION_FAILED
  );
}

export function getRetryDelay(error: unknown, attempt: number): number {
  // Exponential backoff with jitter
  const baseDelay = 1000; // 1 second
  const maxDelay = 10000; // 10 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  const jitter = Math.random() * 0.1 * delay; // 10% jitter
  return delay + jitter;
}
