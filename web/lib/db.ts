import { Pool } from "pg";

// Один пул на процесс. В режиме разработки модуль перезагружается, поэтому пул храним в globalThis.
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;
