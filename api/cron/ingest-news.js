// api/cron/ingest-news.js
//
// Roda a cada 6h (configurado em vercel.json).
// Fluxo: busca na tabela `fontes` os portais sem rss_url próprio cujo domínio
// está na allowlist do /api/feed -> chama /api/feed para cada um -> parseia
// o XML RSS retornado -> insere em `noticias` no Supabase (ignorando
// duplicados por url_original).
//
// Schema confirmado (Supabase):
// fontes: id, nome, url, rss_url, regiao, ativo, ultima_coleta, status, created_at
// noticias: id, titulo, resumo, conteudo_original, url_original, fonte_id,
//           fonte_nome, regiao, cidade, categoria, data_publicacao, imagem_url,
//           relevancia, grupo_duplicidade, processado_ia, created_at
//
// ⚠️ Para o "ignore-duplicates" funcionar, `noticias.url_original` precisa
// ter uma constraint UNIQUE no Supabase. Rode antes, se ainda não existir:
//   ALTER TABLE noticias ADD CONSTRAINT noticias_url_original_key UNIQUE (url_original);

import { XMLParser } from "fast-xml-parser";

// --- Configuração que pode precisar de ajuste ---
const NOTICIAS_TABLE = "noticias";
const FONTES_TABLE = "fontes";

// Domínios cobertos pelo /api/feed (scraping HTML / RSS gerado)
const ALLOWLIST_DOMAINS = [
  "g1.globo.com",
  "noticias.r7.com",
  "meiahora.com.br",
  "www.meiahora.com.br",
  "atribunarj.com.br",
  "folhadoslagos.com",
  "campos24horas.com.br",
  "ururau.com.br",
  "focoregional.com.br",
];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // precisa ser a service_role key para insert/upsert
const FEED_API_KEY = process.env.FEED_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET; // opcional, recomendado

function getOwnFeedBaseUrl(req) {
  // Em produção, VERCEL_URL é o domínio do deployment atual
  const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `https://${req.headers.host}`;
  return host;
}

async function fetchFontesAtivas() {
  // Colunas reais da tabela `fontes`: id, nome, url, rss_url, regiao, ativo, status
  const url = `${SUPABASE_URL}/rest/v1/${FONTES_TABLE}?select=id,nome,url,rss_url,regiao,ativo&ativo=eq.true`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Falha ao buscar fontes: ${res.status}`);
  const fontes = await res.json();

  // Só fontes sem rss_url próprio (precisam do fallback) E cujo domínio está na allowlist do /api/feed
  return fontes.filter((f) => {
    if (f.rss_url) return false; // já tem RSS nativo, não precisa do scraping
    if (!f.url) return false;
    let dominio;
    try {
      dominio = new URL(f.url).hostname;
    } catch {
      return false;
    }
    return ALLOWLIST_DOMAINS.some((d) => dominio.includes(d));
  });
}

async function fetchFeedXml(baseUrl, sourceUrl) {
  const feedUrl = `${baseUrl}/api/feed?url=${encodeURIComponent(sourceUrl)}&key=${FEED_API_KEY}`;
  const res = await fetch(feedUrl);
  if (!res.ok) {
    console.error(`Erro ao buscar feed de ${sourceUrl}: ${res.status}`);
    return null;
  }
  return res.text();
}

function parseRssItems(xml) {
  const parser = new XMLParser({ ignoreAttributes: false });
  const json = parser.parse(xml);
  const items = json?.rss?.channel?.item || [];
  return Array.isArray(items) ? items : [items];
}

async function upsertNoticias(items, fonte) {
  if (!items.length) return 0;

  // Colunas reais da tabela `noticias`
  const rows = items.map((item) => ({
    titulo: item.title || "",
    resumo: item.description || "",
    url_original: item.link || "",
    fonte_id: fonte.id,
    fonte_nome: fonte.nome,
    regiao: fonte.regiao || null,
    data_publicacao: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    processado_ia: false,
  }));

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${NOTICIAS_TABLE}?on_conflict=url_original`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates", // exige constraint UNIQUE em url_original
      },
      body: JSON.stringify(rows),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Erro ao inserir notícias de ${fonte.nome}: ${res.status} ${errText}`);
    return 0;
  }
  return rows.length;
}

export default async function handler(req, res) {
  // Protege o endpoint para só aceitar chamadas do Vercel Cron
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const baseUrl = getOwnFeedBaseUrl(req);
    const fontes = await fetchFontesAtivas();

    let totalInseridas = 0;
    const resultados = [];

    for (const fonte of fontes) {
      const xml = await fetchFeedXml(baseUrl, fonte.url);
      if (!xml) {
        resultados.push({ fonte: fonte.nome, status: "erro_fetch" });
        continue;
      }
      const items = parseRssItems(xml);
      const inseridas = await upsertNoticias(items, fonte);
      totalInseridas += inseridas;
      resultados.push({ fonte: fonte.nome, itens: items.length, inseridas });
    }

    return res.status(200).json({
      ok: true,
      totalFontes: fontes.length,
      totalInseridas,
      resultados,
    });
  } catch (err) {
    console.error("Erro no cron de ingestão:", err);
    return res.status(500).json({ error: err.message });
  }
}