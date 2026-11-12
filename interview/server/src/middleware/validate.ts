import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

/** Validates and replaces req.body with the parsed (trimmed / normalized) value. */
export const validateBody =
  (schema: ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_form';
        if (!fields[key]) fields[key] = issue.message;
      }
      return next(new AppError(400, 'Please correct the highlighted fields', 'VALIDATION_ERROR', fields));
    }
    req.body = result.data;
    next();
  };

