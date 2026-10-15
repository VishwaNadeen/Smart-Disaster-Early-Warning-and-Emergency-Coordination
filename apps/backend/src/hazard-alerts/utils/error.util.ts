const MAX_STORED_ERROR_LENGTH = 500;
const MONGO_DUPLICATE_KEY_CODE = 11000;

/**
 * Produces an error description that is safe to persist or log. Only the
 * error message is kept (never headers, request bodies or stack traces, so
 * provider credentials cannot leak) and it is truncated to 500 characters,
 * which matches the `failureReason` column limit.
 *
 * @param error Any value caught in a `catch` block.
 */
export function safeError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : 'Unknown provider error';

  return message.slice(0, MAX_STORED_ERROR_LENGTH);
}

/**
 * Tells whether a caught value is a MongoDB duplicate-key error (E11000),
 * raised when a unique index rejects a second identical document.
 */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === MONGO_DUPLICATE_KEY_CODE
  );
}
