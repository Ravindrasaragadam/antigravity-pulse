import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (typeof window !== 'undefined') {
  console.log("Supabase Client Init - URL present:", !!supabaseUrl);
  console.log("Supabase Client Init - Key present:", !!supabaseAnonKey);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
