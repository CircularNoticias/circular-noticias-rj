import { createClient } from "@supabase/supabase-js";

const ADS_SUPABASE_URL = "https://rmkmrqugpfzykfvquwhm.supabase.co";
const ADS_SUPABASE_KEY = "sb_publishable_Ccp7ZhYBxduKkSmlxSxFng_nqJ6whUv";

export const supabaseAds = createClient(ADS_SUPABASE_URL, ADS_SUPABASE_KEY);

export const PROJETO_ATUAL = "circular";

export async function buscarCampanha(regiao = "*") {
  const { data, error } = await supabaseAds.rpc("buscar_campanhas", {
    p_projeto: PROJETO_ATUAL,
    p_regiao: regiao,
  });
  if (error || !data || data.length === 0) return null;
  return data[0];
}

export async function registrarEvento(campanhaId, tipo, regiao = null) {
  try {
    await supabaseAds.rpc("registrar_evento", {
      p_campanha_id: campanhaId,
      p_tipo: tipo,
      p_projeto: PROJETO_ATUAL,
      p_regiao: regiao,
    });
  } catch {
    // silencioso — evento perdido não deve afetar o leitor
  }
}
