import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase URL과 Anon Key를 가져옵니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing. Please check your .env file.');
}

// Supabase 클라이언트 인스턴스를 생성하고 내보냅니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
