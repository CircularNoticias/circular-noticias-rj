// api/cron/audit-curadoria.js
//
// Motor de auditoria da curadoria editorial. Roda a MESMA função que a Home
// usa (curarFeedCompleto, importada do módulo compartilhado) sobre o mesmo
// pool de dados, e grava indicadores agregados — sem alterar comportamento,
// sem coletar dado de visitante, sem escrita pública.

import { curarFeedCompleto, FONTES_OFICIAIS, FONTES_GENERICAS } from "../../src/lib/curadoria.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET  = process.env.CRON_SECRET;
const PAGE1_SIZE   = 32;

function contarPor(lista, campo) {
  const mapa = {};
  for (const item of lista) {
    const chave = item[campo] || "Desconhecido";
    mapa[chave] = (mapa[chave] || 0) + 1;
  }
  return mapa;
}

export default async function handler(req, res) {
  const tokenHeader = req.headers.authorization === `Bearer ${CRON_SECRET}`;
  const tokenQuery  = req.query?.key === CRON_SECRET;
  if (CRON_SECRET && !tokenHeader && !tokenQuery) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const resNoticias = await fetch(
      `${SUPABASE_URL}/rest/v1/noticias?select=id,fonte_nome,categoria,regiao,created_at&order=created_at.desc&limit=1000`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!resNoticias.ok) throw new Error(`Fetch notícias: ${resNoticias.status}`);
    const rows = await resNoticias.json();

    const pool = rows.map(r => ({
      id: r.id,
      source: r.fonte_nome,
      category: r.categoria || "Geral",
      region: r.regiao,
      isOficial: FONTES_OFICIAIS.has(r.fonte_nome),
      isGenerica: FONTES_GENERICAS.has(r.fonte_nome),
    }));

    const feedCurado = curarFeedCompleto(pool, PAGE1_SIZE, 4, 2, 1);
    const pagina1 = feedCurado.slice(0, PAGE1_SIZE);

    const registro = {
      total_pool: pool.length,
      total_pagina1: pagina1.length,
      oficiais_pagina1: pagina1.filter(n => n.isOficial).length,
      genericas_pagina1: pagina1.filter(n => n.isGenerica).length,
      distribuicao_categoria: contarPor(pagina1, "category"),
      distribuicao_regiao: contarPor(pagina1, "region"),
      distribuicao_fonte: contarPor(pagina1, "source"),
    };

    const resInsert = await fetch(`${SUPABASE_URL}/rest/v1/auditoria_curadoria`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify([registro]),
    });
    if (!resInsert.ok) throw new Error(`Insert auditoria: ${resInsert.status}`);

    return res.status(200).json({ ok: true, ...registro });
  } catch (err) {
    console.error("Audit curadoria error:", err);
    return res.status(500).json({ error: err.message });
  }
}
