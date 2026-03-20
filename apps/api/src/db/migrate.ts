import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = postgres(config.DATABASE_URL, { max: 1 });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const migrationsDir = join(__dirname, 'migrations');
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const filename of files) {
      const [existing] = await sql`
        SELECT filename FROM _migrations WHERE filename = ${filename}
      `;
      if (existing) {
        console.log(`[migrate] skipping ${filename} (already applied)`);
        continue;
      }

      const filePath = join(migrationsDir, filename);
      const content = await readFile(filePath, 'utf-8');

      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`INSERT INTO _migrations (filename) VALUES (${filename})`;
      });

      console.log(`[migrate] applied ${filename}`);
    }

    console.log('[migrate] done');
  } finally {
    await sql.end();
  }
}

migrate().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
