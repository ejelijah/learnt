import { createClient } from '@supabase/supabase-js'

// VITE syntax: Use import.meta.env instead of process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY


// This check helps you debug if the variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing! Check your .env file.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

