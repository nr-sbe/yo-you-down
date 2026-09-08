// This file validates public configuration; never put a private API key in the app.
export function validatePublicConfig(value, { requireLive = false } = {}) {
  const url = (value.supabaseUrl || '').trim().replace(/\/$/, '');
  const key = (value.supabasePublishableKey || '').trim();
  if (!url && !key && !requireLive) return {supabaseUrl:'',supabasePublishableKey:'',configured:false};
  if (!url || !key) throw new Error('Live sharing needs your Supabase project URL and publishable key. Follow START-HERE.md before publishing.');
  let origin;
  try {origin = new URL(url);} catch {throw new Error('Enter a valid Supabase HTTPS project URL.');}
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error('Use the HTTPS Supabase project origin, without a path or credentials.');
  if (!key.startsWith('sb_publishable_')) throw new Error('Use a Supabase publishable key beginning sb_publishable_. Never use a secret or service_role key.');
  return {supabaseUrl:url,supabasePublishableKey:key,configured:true};
}
