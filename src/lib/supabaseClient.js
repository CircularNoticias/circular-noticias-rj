import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Supabase: variáveis de ambiente faltando. Confirme VITE_SUPABASE_URL e VITE_SUPABASE_KEY no .env (local) e nas Environment Variables do projeto na Vercel."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
