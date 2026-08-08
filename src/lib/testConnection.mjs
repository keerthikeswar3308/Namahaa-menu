import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rhnrcyzzqmqgqoigjmuu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobnJjeXp6cW1xZ3FvaWdqbXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNDQ1NzEsImV4cCI6MjEwMDgyMDU3MX0.k_WOrw3ODkgXPWt6VnVdLFhUcuFR0UuTdmb97KX8C_4';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testQuery() {
  const { data, error } = await supabase.from('menu_items').select('id, name, price, image');
  if (error) {
    console.error('Supabase query error:', error);
  } else {
    console.log(`✅ Supabase connection SUCCESS! Found ${data.length} dishes in database:`);
    data.slice(0, 5).forEach(d => console.log(`- ${d.name} (₹${d.price})`));
  }
}

testQuery();
