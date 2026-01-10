import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
// Prefer a service role key on the backend; fall back to SUPABASE_KEY if not set
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_KEY (service role) is not set in environment. Set them in your backend .env or API.env');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');
