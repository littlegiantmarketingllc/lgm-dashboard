import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Read a checkbox state blob by key
export async function sbRead(key) {
  const { data } = await supabase
    .from('checkboxes')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return data?.value ?? {};
}

// Write a checkbox state blob by key
export async function sbWrite(key, value) {
  await supabase
    .from('checkboxes')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}
