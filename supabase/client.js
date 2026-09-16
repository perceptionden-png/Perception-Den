// Browser ES module. For a bundled app, install @supabase/supabase-js and
// import createClient from that package instead of this CDN URL.
import {createClient} from '../vendor/supabase-2.116.0.js';
import { createCollaborationApi } from './collaboration-api.js';

export function connectSupabase({ url, publishableKey }) {
  if (!url || !publishableKey) throw new Error('Set your Supabase URL and publishable key.');
  const supabase = createClient(url, publishableKey);
  return { supabase, ...createCollaborationApi(supabase) };
}
