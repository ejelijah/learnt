import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'


dotenv.config({ path: 'API.env' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseroleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseroleKey) {
  console.error("Current SUPABASE_URL:", process.env.SUPABASE_URL)
  throw new Error('Supabase variables not found in API.env')
}

export const supabase = createClient(supabaseUrl, supabaseroleKey)
