/**
 * TaxAgent.ai — Knowledge Base Seeder
 *
 * Embeds each entry in KNOWLEDGE_BASE and upserts it into the tax_knowledge
 * Supabase table. Matching is done on (source, category) to allow safe re-runs
 * without creating duplicates.
 *
 * Usage:
 *   npx tsx scripts/seed-knowledge-base.ts
 *
 * Requires in environment:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Resolve path aliases manually in Node scripts (tsconfig paths aren't applied by tsx by default)
import { KNOWLEDGE_BASE } from '../src/lib/rag/knowledge-base';
import { embedText } from '../src/lib/rag/embed';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    '[seed] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check .env.local',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  const total = KNOWLEDGE_BASE.length;
  console.log(`[seed] Starting — ${total} entries to embed and upsert\n`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const entry = KNOWLEDGE_BASE[i];
    const label = `${i + 1}/${total}: ${entry.category}`;

    try {
      process.stdout.write(`[seed] Embedding ${label}...`);

      const embedding = await embedText(entry.content);

      const { error } = await supabase.from('tax_knowledge').upsert(
        {
          content: entry.content,
          source: entry.source,
          category: entry.category,
          embedding,
        },
        // Deduplicate on the natural key (source + category).
        // Requires a unique constraint on (source, category) in Supabase.
        { onConflict: 'source,category' },
      );

      if (error) {
        console.error(` FAILED\n  → ${error.message}`);
        failed++;
      } else {
        console.log(' OK');
        succeeded++;
      }
    } catch (err) {
      console.error(` ERROR\n  → ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n[seed] Done — ${succeeded} succeeded, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
