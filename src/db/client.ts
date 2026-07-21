import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL não definida. Copie o .env.example para .env (veja o README).');
}

// Prisma 7 usa query compiler + driver adapter: o pool é gerenciado pelo `pg`.
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
