import { createClient } from '@supabase/supabase-js';
const supabaseUrl =  'https://krfvpuakifwlzcdjbnol.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZnZwdWFraWZ3bHpjZGpibm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NDg4NjgsImV4cCI6MjA2NjAyNDg2OH0.z5NCEERy5cN95ZR7FQWI2xrdhwZp7K7IVOGjfnfg19A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
