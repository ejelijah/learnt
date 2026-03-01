import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load API.env from the same directory as this file (works no matter where you run node from)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'API.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseRoleKey) {
  console.error('Supabase env check — SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.error('Supabase env check — SUPABASE_SERVICE_ROLE_KEY:', supabaseRoleKey ? 'set' : 'MISSING');
  throw new Error('Supabase variables not found. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to backend/API.env');
}

export const supabase = createClient(supabaseUrl, supabaseRoleKey);
