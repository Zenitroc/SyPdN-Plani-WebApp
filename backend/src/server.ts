import { buildApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './infrastructure/prisma.js';

const app = await buildApp();
await app.listen({ port: env.PORT, host: '0.0.0.0' });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, async () => { await app.close(); await prisma.$disconnect(); process.exit(0); });
