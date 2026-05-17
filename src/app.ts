import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import apiRouter from './routes';
import { errorHandler } from './common/middleware/errorHandler';
import { tzDateTime } from './common/utils/date';
process.env.TZ = env.TIMEZONE;

function serializeDhakaDates(value: unknown): unknown {
  if (value instanceof Date) {
    return tzDateTime(value);
  }

  if (Array.isArray(value)) {
    return value.map(serializeDhakaDates);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, serializeDhakaDates(nested)]),
    );
  }

  return value;
}

export const app = express();

app.use((_req, res, next) => {
  const json = res.json.bind(res);
  res.json = ((body: unknown) => json(serializeDhakaDates(body))) as typeof res.json;
  next();
});

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

app.use('/api/v1', apiRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);
