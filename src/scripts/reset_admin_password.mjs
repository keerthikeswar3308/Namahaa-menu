import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local if present
let envUrl = '';
let envServiceKey = '';

try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        val = val.trim().replace(/^['"](.*)['"]$/, '$1');
        if (key === 'NEXT_PUBLIC_SUPABASE_URL') envUrl = val;
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') envServiceKey = val;
      }
    });
  }
} catch (e) {}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || envUrl || 'https://rhnrcyzzqmqgqoigjmuu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envServiceKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobnJjeXp6cW1xZ3FvaWdqbXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTI0NDU3MSwiZXhwIjoyMTAwODIwNTcxfQ.bmrhHCAAZ4HTEJobqVhvMiCGyVG8OBFK_-9E9WxzM3M';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function resetAdminPassword() {
  const targetUsername = process.argv[2] || 'admin';
  const targetPasscode = process.argv[3] || 'namahaa2026';

  console.log(`Resetting admin credentials in database to:`);
  console.log(`Username: ${targetUsername}`);
  console.log(`Passcode: ${targetPasscode}`);

  try {
    const { data, error } = await supabaseAdmin
      .from('restaurant_info')
      .upsert(
        {
          id: 1,
          admin_username: targetUsername,
          admin_passcode: targetPasscode,
        },
        { onConflict: 'id' }
      )
      .select();

    if (error) {
      console.error('Error updating restaurant_info:', error.message);
      process.exit(1);
    }

    console.log('✓ Successfully reset admin credentials in database!');
    console.log(`Admin can now log in at /admin using username: "${targetUsername}" and passcode: "${targetPasscode}".`);
  } catch (err) {
    console.error('Exception while resetting credentials:', err);
    process.exit(1);
  }
}

resetAdminPassword();

