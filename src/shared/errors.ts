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
 * Type guard to check if an error is an AbortError
 */
export function isAbortError(error: unknown): error is JorElAbortError {
  return (
    error instanceof JorElAbortError ||
    (error instanceof Error && "isAbortError" in error && (error as any).isAbortError === true)
  );
}
