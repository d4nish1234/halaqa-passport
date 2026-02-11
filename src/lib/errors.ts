import { FirebaseError } from 'firebase/app';

/**
 * Application error types for better error handling and user messaging
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  FIREBASE = 'FIREBASE',
  UNKNOWN = 'UNKNOWN',
}

export type AppError = {
  type: ErrorType;
  message: string;
  userMessage: string;
  originalError?: Error;
  recoverable: boolean;
  retryable: boolean;
};

/**
 * Convert various error types to a consistent AppError format
 */
export function normalizeError(error: unknown): AppError {
  // Firebase errors
  if (error instanceof FirebaseError) {
    return handleFirebaseError(error);
  }

  // Network errors
  if (
    error instanceof TypeError &&
    (error.message.includes('fetch') || error.message.includes('network'))
  ) {
    return {
      type: ErrorType.NETWORK,
      message: 'Network request failed',
      userMessage: 'No internet connection. Please check your network and try again.',
      originalError: error,
      recoverable: true,
      retryable: true,
    };
  }

  // Standard Error objects
  if (error instanceof Error) {
    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      userMessage: 'Something went wrong. Please try again.',
      originalError: error,
      recoverable: true,
      retryable: true,
    };
  }

  // Unknown error types
  return {
    type: ErrorType.UNKNOWN,
    message: String(error),
    userMessage: 'An unexpected error occurred. Please try again.',
    recoverable: true,
    retryable: true,
  };
}

/**
 * Handle Firebase-specific errors with appropriate user messages
 */
function handleFirebaseError(error: FirebaseError): AppError {
  const baseError: AppError = {
    type: ErrorType.FIREBASE,
    message: error.message,
    userMessage: 'Something went wrong. Please try again.',
    originalError: error,
    recoverable: true,
    retryable: false,
  };

  switch (error.code) {
    case 'unavailable':
    case 'failed-precondition':
      return {
        ...baseError,
        type: ErrorType.NETWORK,
        userMessage: 'Could not connect to the server. Please check your internet connection.',
        retryable: true,
      };

    case 'permission-denied':
      return {
        ...baseError,
        type: ErrorType.PERMISSION,
        userMessage: 'You do not have permission to perform this action.',
        recoverable: false,
      };

    case 'not-found':
      return {
        ...baseError,
        type: ErrorType.NOT_FOUND,
        userMessage: 'The requested information could not be found.',
        recoverable: false,
      };

    case 'already-exists':
      return {
        ...baseError,
        type: ErrorType.VALIDATION,
        userMessage: 'This action has already been completed.',
        recoverable: false,
      };

    case 'resource-exhausted':
      return {
        ...baseError,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        retryable: true,
      };

    case 'deadline-exceeded':
      return {
        ...baseError,
        userMessage: 'The request took too long. Please try again.',
        retryable: true,
      };

    default:
      return baseError;
  }
}

/**
 * Log and track errors appropriately based on their severity
 */
export function handleError(error: unknown, context?: Record<string, unknown>): AppError {
  const appError = normalizeError(error);

  // Log to console for debugging
  console.error('Error:', appError.message, context);
  if (appError.originalError) {
    console.error('Original error:', appError.originalError);
  }

  return appError;
}

/**
 * Create a user-friendly error message with optional recovery action
 */
export function formatErrorMessage(
  error: AppError,
  action?: string
): { message: string; action?: string } {
  let message = error.userMessage;

  if (action && error.retryable) {
    return {
      message,
      action: `Pull down to ${action}`,
    };
  }

  return { message };
}
