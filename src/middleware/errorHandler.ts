import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Central error-handling middleware.
 * Distinguishes operational errors (safe to surface) from programming errors.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const isOperational = err.isOperational ?? false;

  console.error(`[ErrorHandler] ${statusCode} – ${err.message}`, {
    stack: err.stack,
    isOperational,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message: isOperational ? err.message : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/** Factory for creating typed operational errors. */
export function createError(message: string, statusCode = 500): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}
