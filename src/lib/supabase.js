import { createClient } from '@supabase/supabase-js';

// Fall back to dummy values so createClient doesn't throw when env vars are unset.
// API calls will fail gracefully (network error) — all callers use try/catch.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL  || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
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
