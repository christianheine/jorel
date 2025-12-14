/**
 * Error thrown when a generation request is cancelled via AbortSignal
 */
export class JorElAbortError extends Error {
  readonly name = "AbortError";
  readonly code = "GENERATION_ABORTED";
  readonly isAbortError = true;

  constructor(message: string = "Generation was cancelled") {
    super(message);
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, JorElAbortError);
    }
  }
}

/**
 * Error thrown when an LLM provider encounters an error
 */
export class JorElLlmError extends Error {
  readonly name = "LlmError";
  readonly code = "LLM_ERROR";

  constructor(
    message: string,
    public readonly type: string,
  ) {
    super(message);
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, JorElLlmError);
    }
  }
}

/**
 * Type guard to check if an error is an AbortError
 */
export function isAbortError(error: unknown): error is JorElAbortError {
  return (
    error instanceof JorElAbortError ||
    (error instanceof Error && "isAbortError" in error && (error as any).isAbortError === true) ||
    (error instanceof Error && error.name === "AbortError") ||
    (error instanceof Error && error.message.includes("aborted"))
  );
}

/**
 * Type guard to check if an error is an LlmError
 */
export function isLlmError(error: unknown): error is JorElLlmError {
  return error instanceof JorElLlmError;
}
