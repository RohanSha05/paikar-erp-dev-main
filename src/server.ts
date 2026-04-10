import { app } from './app';
import { env } from './config/env';
import { prisma } from './db/prisma';
import { logger } from './config/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`Backend running on port ${env.PORT}`);
});

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
