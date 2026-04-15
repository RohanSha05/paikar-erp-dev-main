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

    req.body = parsed.body;
    req.params = parsed.params;
    req.query = parsed.query;

    next();
  };
}
