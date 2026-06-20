export type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };

export function success<T>(value: T): Result<T, never> {
  return { success: true, value };
}

export function failure<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; value: T } {
  return result.success;
}

export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

export function unwrapOr<T>(result: Result<T>, fallback: T): T {
  return result.success ? result.value : fallback;
}
