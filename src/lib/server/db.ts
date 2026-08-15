import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '$env/dynamic/private';
import { PrismaClient } from '../../../generated/prisma/client.ts';

// En dev, Vite recharge à chaud les modules serveur : sans ce cache sur
// globalThis, chaque rechargement instancierait un nouveau pool pg et
// finirait par saturer le nombre de connexions autorisées par Postgres.
const global_ = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
	global_.prisma ??
	new PrismaClient({
		adapter: new PrismaPg({ connectionString: env.DATABASE_URL })
	});

if (import.meta.env.DEV) {
	global_.prisma = prisma;
}
