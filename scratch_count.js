import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { count: teacherCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
  const { count: programCount } = await supabase.from('programs').select('*', { count: 'exact', head: true });
  console.log('Teachers:', teacherCount);
  console.log('Programs:', programCount);
}
check();
