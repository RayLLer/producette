// Runs `drizzle-kit pull` and patches a drizzle-kit bug: empty-string defaults in auth.users
// come out as `.default(')`, which is invalid TS. Also removes the unused SQL snapshot it writes.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'lib/server/db/generated';

execSync('npx drizzle-kit pull', { stdio: 'inherit' });

const schemaPath = join(dir, 'schema.ts');
const fixed = readFileSync(schemaPath, 'utf8').replaceAll(".default(')", ".default('')");
writeFileSync(schemaPath, fixed);

for (const file of readdirSync(dir)) {
  if (file.endsWith('.sql')) rmSync(join(dir, file));
}
