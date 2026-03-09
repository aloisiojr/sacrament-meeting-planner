/**
 * E2E Test Data Cleanup Script
 *
 * Deletes all E2E test users (matching e2e-*@test.com) and their
 * associated wards from the Supabase database using the admin SDK.
 *
 * Required environment variables (DO NOT commit these):
 *   SUPABASE_URL          - Supabase project URL (e.g., https://{project}.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin API access
 *
 * Usage:
 *   deno run --allow-net --allow-env e2e/scripts/cleanup.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required."
  );
  console.error(
    "Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... deno run --allow-net --allow-env e2e/scripts/cleanup.ts"
  );
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Paginated listUsers to handle >50 users (same pattern as send-reset-email, ADR-032)
const E2E_EMAIL_PATTERN = /^e2e-.*@test\.com$/;
const testUsers: Array<{
  id: string;
  email: string;
  ward_id?: string;
}> = [];

let page = 1;
const perPage = 50;

while (true) {
  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers({ page, perPage });

  if (error) {
    console.error(`Error listing users (page ${page}):`, error.message);
    Deno.exit(1);
  }

  for (const user of users) {
    if (user.email && E2E_EMAIL_PATTERN.test(user.email)) {
      testUsers.push({
        id: user.id,
        email: user.email,
        ward_id: user.app_metadata?.ward_id,
      });
    }
  }

  if (users.length < perPage) break;
  page++;
}

if (testUsers.length === 0) {
  console.log("No test users found.");
  Deno.exit(0);
}

console.log(`Found ${testUsers.length} test user(s) to delete.\n`);

let usersDeleted = 0;
let wardsDeleted = 0;

for (const testUser of testUsers) {
  try {
    // Delete ward first (CASCADE deletes speeches, agendas, etc.)
    if (testUser.ward_id) {
      const { error: wardError } = await supabase
        .from("wards")
        .delete()
        .eq("id", testUser.ward_id);

      if (wardError) {
        console.warn(
          `  Warning: Could not delete ward ${testUser.ward_id} for ${testUser.email}: ${wardError.message}`
        );
      } else {
        wardsDeleted++;
        console.log(`  Deleted ward: ${testUser.ward_id}`);
      }
    }

    // Delete auth user
    const { error: userError } = await supabase.auth.admin.deleteUser(
      testUser.id
    );

    if (userError) {
      console.error(
        `  Error deleting user ${testUser.email}: ${userError.message}`
      );
    } else {
      usersDeleted++;
      console.log(`  Deleted user: ${testUser.email}`);
    }
  } catch (err) {
    console.error(
      `  Unexpected error processing ${testUser.email}:`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

console.log(`\nSummary: ${usersDeleted} user(s) deleted, ${wardsDeleted} ward(s) deleted.`);
