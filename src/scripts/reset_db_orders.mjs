import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhnrcyzzqmqgqoigjmuu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobnJjeXp6cW1xZ3FvaWdqbXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNDQ1NzEsImV4cCI6MjEwMDgyMDU3MX0.k_WOrw3ODkgXPWt6VnVdLFhUcuFR0UuTdmb97KX8C_4';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('--- STARTING DATABASE ORDER DATA RESET ---');

  // 1. Delete order_items
  const { error: oiErr } = await supabaseAdmin
    .from('order_items')
    .delete()
    .neq('id', '0');

  if (oiErr) {
    console.error('Error deleting order_items:', oiErr.message);
  } else {
    console.log('✓ Successfully cleared public.order_items table.');
  }

  // 2. Delete orders
  const { error: ordErr } = await supabaseAdmin
    .from('orders')
    .delete()
    .neq('id', '0');

  if (ordErr) {
    console.error('Error deleting orders:', ordErr.message);
  } else {
    console.log('✓ Successfully cleared public.orders table.');
  }

  // 3. Verify counts
  const { count: ordCount } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true });

  const { count: oiCount } = await supabaseAdmin
    .from('order_items')
    .select('*', { count: 'exact', head: true });

  const { count: menuCount } = await supabaseAdmin
    .from('menu_items')
    .select('*', { count: 'exact', head: true });

  const { count: catCount } = await supabaseAdmin
    .from('categories')
    .select('*', { count: 'exact', head: true });

  console.log('\n--- VERIFICATION RESULT ---');
  console.log(`Orders remaining: ${ordCount}`);
  console.log(`Order Items remaining: ${oiCount}`);
  console.log(`Menu Items preserved: ${menuCount}`);
  console.log(`Categories preserved: ${catCount}`);
  console.log('--- DATABASE ORDER DATA RESET COMPLETE ---');
}

main().catch((err) => {
  console.error('Fatal reset error:', err);
  process.exit(1);
});
