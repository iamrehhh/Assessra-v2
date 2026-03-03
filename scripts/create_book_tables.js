/**
 * Create the required Supabase tables for the Book Reader feature.
 * Run: node scripts/create_book_tables.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    console.log('Creating book_progress table...');

    // Try creating by inserting a dummy row and deleting it,
    // or use rpc if available. Supabase JS doesn't have DDL, 
    // so we'll use the REST API to run SQL.

    // First, check if tables exist by trying to select from them
    const { error: progressErr } = await supabase.from('book_progress').select('user_email').limit(1);
    if (progressErr && progressErr.message.includes('does not exist')) {
        console.log('  book_progress table does not exist. Please create it in Supabase dashboard:');
        console.log(`
  CREATE TABLE book_progress (
      user_email TEXT PRIMARY KEY,
      chapter_index INTEGER DEFAULT 0,
      book_completed BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );
        `);
    } else {
        console.log('  book_progress table already exists ✓');
    }

    const { error: completionsErr } = await supabase.from('book_completions').select('id').limit(1);
    if (completionsErr && completionsErr.message.includes('does not exist')) {
        console.log('  book_completions table does not exist. Please create it in Supabase dashboard:');
        console.log(`
  CREATE TABLE book_completions (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      book_title TEXT DEFAULT 'Nexus',
      completed_at TIMESTAMPTZ DEFAULT NOW()
  );
        `);
    } else {
        console.log('  book_completions table already exists ✓');
    }
}

main().catch(console.error);
