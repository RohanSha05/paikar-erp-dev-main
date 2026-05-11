import { NextFunction, Request, Response } from 'express';
import { type ZodTypeAny } from 'zod';

export function validate<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query
    }) as {
      body: Request['body'];
      params: Request['params'];
      query: Request['query'];
    };

    // Preserve existing request fields when a schema validates only one part
    // (e.g. params-only middleware before body middleware).
    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }
    if (parsed.params !== undefined) {
      req.params = parsed.params;
    }
    if (parsed.query !== undefined) {
      req.query = parsed.query;
    }

    next();
  };
}
