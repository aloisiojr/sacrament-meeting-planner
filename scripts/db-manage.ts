#!/usr/bin/env npx tsx
/**
 * CLI script: pnpm db <command> [args]
 *
 * Database management commands for the Sacrament Meeting Planner.
 *
 * Commands:
 *   list-wards                     List all wards with member/speech counts
 *   clear-ward <ward-name>         Delete all data for a ward (keeps the ward record)
 *   delete-ward <ward-name>        Delete a ward and ALL its data permanently
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars (from .env).
 *
 * Exit codes: 0=success, 1=error, 2=missing args/env
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// --- Ward-scoped tables (order matters: delete children before parents) ---
const WARD_CHILD_TABLES = [
  'notification_queue',
  'device_push_tokens',
  'activity_log',
  'invitations',
  'sunday_agendas',
  'speeches',
  'sunday_exceptions',
  'ward_topics',
  'meeting_actors',
  'ward_collection_config',
  'members',
] as const;

// --- Supabase client ---
function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required.');
    console.error('Make sure your .env file exists in the project root.');
    process.exit(2);
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// --- Commands ---

async function listWards(supabase: SupabaseClient) {
  const { data: wards, error } = await supabase
    .from('wards')
    .select('id, name, stake_name, language, timezone, created_at')
    .order('name');

  if (error) {
    console.error(`Error fetching wards: ${error.message}`);
    process.exit(1);
  }

  if (!wards || wards.length === 0) {
    console.log('No wards found.');
    return;
  }

  console.log(`\nFound ${wards.length} ward(s):\n`);

  for (const ward of wards) {
    // Count members
    const { count: memberCount } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('ward_id', ward.id);

    // Count speeches
    const { count: speechCount } = await supabase
      .from('speeches')
      .select('*', { count: 'exact', head: true })
      .eq('ward_id', ward.id);

    // Count actors
    const { count: actorCount } = await supabase
      .from('meeting_actors')
      .select('*', { count: 'exact', head: true })
      .eq('ward_id', ward.id);

    console.log(`  ${ward.name} (${ward.stake_name})`);
    console.log(`    ID: ${ward.id}`);
    console.log(`    Language: ${ward.language} | Timezone: ${ward.timezone}`);
    console.log(`    Members: ${memberCount ?? 0} | Speeches: ${speechCount ?? 0} | Actors: ${actorCount ?? 0}`);
    console.log(`    Created: ${ward.created_at}`);
    console.log('');
  }
}

async function findWard(supabase: SupabaseClient, wardName: string) {
  const { data: wards, error } = await supabase
    .from('wards')
    .select('id, name, stake_name')
    .ilike('name', wardName);

  if (error) {
    console.error(`Error searching for ward: ${error.message}`);
    process.exit(1);
  }

  if (!wards || wards.length === 0) {
    console.error(`Ward "${wardName}" not found.`);
    console.error('Use "pnpm db list-wards" to see available wards.');
    process.exit(1);
  }

  if (wards.length > 1) {
    console.error(`Multiple wards match "${wardName}":`);
    for (const w of wards) {
      console.error(`  - ${w.name} (${w.stake_name}) [${w.id}]`);
    }
    console.error('Please use a more specific name.');
    process.exit(1);
  }

  return wards[0];
}

async function clearWard(supabase: SupabaseClient, wardName: string) {
  const ward = await findWard(supabase, wardName);

  console.log(`\nClearing all data for ward: ${ward.name} (${ward.stake_name})`);
  console.log(`Ward ID: ${ward.id}`);
  console.log('The ward record itself will be preserved.\n');

  for (const table of WARD_CHILD_TABLES) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('ward_id', ward.id);

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('ward_id', ward.id);

    if (error) {
      console.error(`  Error clearing ${table}: ${error.message}`);
      process.exit(1);
    }

    console.log(`  ${table}: ${count ?? 0} rows deleted`);
  }

  console.log(`\nDone. Ward "${ward.name}" data cleared. Ward record preserved.`);
}

async function deleteWard(supabase: SupabaseClient, wardName: string) {
  const ward = await findWard(supabase, wardName);

  console.log(`\nDeleting ward and ALL data: ${ward.name} (${ward.stake_name})`);
  console.log(`Ward ID: ${ward.id}`);
  console.log('This will delete the ward record and all associated data.\n');

  // Clear child tables first
  for (const table of WARD_CHILD_TABLES) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('ward_id', ward.id);

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('ward_id', ward.id);

    if (error) {
      console.error(`  Error clearing ${table}: ${error.message}`);
      process.exit(1);
    }

    console.log(`  ${table}: ${count ?? 0} rows deleted`);
  }

  // Delete the ward itself
  const { error } = await supabase
    .from('wards')
    .delete()
    .eq('id', ward.id);

  if (error) {
    console.error(`  Error deleting ward: ${error.message}`);
    process.exit(1);
  }

  console.log(`  wards: 1 row deleted`);
  console.log(`\nDone. Ward "${ward.name}" permanently deleted.`);
}

// --- Main ---

function printUsage() {
  console.log('Usage: pnpm db <command> [args]');
  console.log('');
  console.log('Commands:');
  console.log('  list-wards                  List all wards with counts');
  console.log('  clear-ward <ward-name>      Clear all data for a ward (keeps ward record)');
  console.log('  delete-ward <ward-name>     Delete a ward and ALL its data');
}

async function main() {
  const command = process.argv[2];

  if (!command) {
    printUsage();
    process.exit(2);
  }

  const supabase = getSupabaseAdmin();

  switch (command) {
    case 'list-wards':
      await listWards(supabase);
      break;

    case 'clear-ward': {
      const wardName = process.argv.slice(3).join(' ');
      if (!wardName) {
        console.error('Usage: pnpm db clear-ward <ward-name>');
        process.exit(2);
      }
      await clearWard(supabase, wardName);
      break;
    }

    case 'delete-ward': {
      const wardName = process.argv.slice(3).join(' ');
      if (!wardName) {
        console.error('Usage: pnpm db delete-ward <ward-name>');
        process.exit(2);
      }
      await deleteWard(supabase, wardName);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(2);
  }
}

const isDirectRun = process.argv[1]?.includes('db-manage');
if (isDirectRun) {
  main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}
