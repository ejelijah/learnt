import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'


dotenv.config({ path: 'API.env' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Current SUPABASE_URL:", process.env.SUPABASE_URL)
  throw new Error('Supabase variables not found in API.env')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
