import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rhnrcyzzqmqgqoigjmuu.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobnJjeXp6cW1xZ3FvaWdqbXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTI0NDU3MSwiZXhwIjoyMTAwODIwNTcxfQ.p-k0w8e6oRk-q80r41i3U9F65B6yN82c3m4E_z1X2W8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkStorage() {
  console.log('--- Checking Supabase Database Tables & Buckets ---');
  
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets?.map(b => ({ id: b.id, name: b.name, public: b.public })) || bErr);

  const { data: files, error: fErr } = await supabase.storage.from('food-images').list('menu-items', { limit: 100 });
  console.log(`Files in food-images/menu-items (${files?.length || 0}):`);
  let totalBytes = 0;
  files?.forEach(f => {
    totalBytes += (f.metadata?.size || 0);
    console.log(`- ${f.name} (${((f.metadata?.size || 0) / 1024).toFixed(1)} KB)`);
  });
  console.log(`Total Storage Used in food-images: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

  const { count: itemsCount } = await supabase.from('menu_items').select('*', { count: 'exact', head: true });
  console.log(`Active Menu Items count in DB: ${itemsCount}`);
}

checkStorage();
