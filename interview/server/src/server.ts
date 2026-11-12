import fs from 'fs';
import path from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { getConfig } from './config/env';

let mongodInstance: MongoMemoryServer | null = null;

async function main(): Promise<void> {
  let mongoUri = process.env.MONGODB_URI;

  // If MONGODB_URI is not provided or points to local/in-memory fallback, start MongoMemoryServer
  if (!mongoUri || mongoUri.includes('127.0.0.1:27017') || mongoUri === 'memory' || mongoUri.includes('<cluster>')) {
    try {
      console.log('Starting local embedded MongoDB server...');
      const dbPath = path.resolve(__dirname, '../../.local-mongodb-data');
      if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

      mongodInstance = await MongoMemoryServer.create({
        instance: {
          port: 27017,
          dbPath,
          storageEngine: 'wiredTiger',
        },
      });
      mongoUri = mongodInstance.getUri('prepmind');
      console.log(`Local MongoDB running at ${mongoUri}`);
    } catch (err) {
      // If port 27017 is taken, let MongoMemoryServer choose an available random port
      mongodInstance = await MongoMemoryServer.create();
      mongoUri = mongodInstance.getUri('prepmind');
      console.log(`Local MongoDB running at ${mongoUri}`);
    }
  }

  await connectDB(mongoUri);
  console.log('MongoDB connected successfully');

  const config = getConfig();
  const server = createApp().listen(config.port, () => {
    console.log(`PrepMind API listening on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      disconnectDB()
        .then(() => mongodInstance?.stop())
        .finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start server:', err instanceof Error ? err.message : err);
  process.exit(1);
});
