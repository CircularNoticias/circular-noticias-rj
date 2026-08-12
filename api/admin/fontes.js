// api/admin/fontes.js
//
// Endpoint provisório para gerenciar a tabela `fontes` sem depender do
// painel do Supabase (SQL Editor). Usa a mesma SUPABASE_SERVICE_ROLE_KEY
// já configurada na Vercel para o ingest-news.js — não precisa de nenhuma
// credencial nova, e funciona independente de qual conta está logada no
// dashboard da Supabase, já que fala direto com a REST API do banco.
//
// Autenticação: via ADMIN_SECRET (header "Authorization: Bearer <secret>"
// ou query "?key=<secret>"), um segredo próprio deste endpoint — separado
// do CRON_SECRET para não depender de revelar um valor já existente.
//
// GET  /api/admin/fontes?key=SEU_SECRET
//   Lista as fontes cadastradas (id, nome, url, rss_url, regiao, ativo, status).
//
// POST /api/admin/fontes?key=SEU_SECRET
//   Body JSON: { "nome": "...", "url": "...", "rss_url": "...", "regiao": "...", "ativo": true }
//   Insere uma nova fonte. Campos "rss_url", "regiao" e "ativo" são opcionais
//   ("ativo" default true, "regiao" default "metropolitana").
//
// Este endpoint é uma solução provisória enquanto o acesso ao painel do
// Supabase não é restaurado. Depois de resolvido, pode ser mantido (é útil
// para automações futuras) ou removido sem afetar o restante do pipeline.

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Usa um segredo próprio (ADMIN_SECRET), separado do CRON_SECRET, para não
// depender de revelar um valor "Sensitive" já existente na Vercel (que só é
// mostrado uma vez, na criação, e não pode ser recuperado depois).
const ADMIN_SECRET  = process.env.ADMIN_SECRET;
const FONTES_TABLE  = "fontes";

function autorizado(req) {
  const tokenHeader = req.headers.authorization === `Bearer ${ADMIN_SECRET}`;
  const tokenQuery  = req.query?.key === ADMIN_SECRET;
  return !ADMIN_SECRET || tokenHeader || tokenQuery;
}

function normalizarUrl(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

async function listarFontes() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${FONTES_TABLE}?select=id,nome,url,rss_url,regiao,ativo,status,created_at&order=created_at.desc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Falha ao listar fontes: ${res.status} ${await res.text()}`);
  return res.json();
}

async function inserirFonte(payload) {
  const { nome, url, rss_url, regiao, ativo } = payload || {};

  if (!nome || typeof nome !== "string") {
    throw new Error("Campo obrigatório ausente ou inválido: nome");
  }
  if (!url && !rss_url) {
    throw new Error("Informe ao menos um dos campos: url ou rss_url");
  }

  const corpo = {
    nome: nome.trim(),
    url: url ? normalizarUrl(url.trim()) : null,
    rss_url: rss_url ? normalizarUrl(rss_url.trim()) : null,
    regiao: regiao ? regiao.trim() : "metropolitana",
    ativo: ativo === undefined ? true : Boolean(ativo),
    status: "ativo",
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${FONTES_TABLE}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(corpo),
  });

  if (!res.ok) {
    throw new Error(`Falha ao inserir fonte: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  if (!autorizado(req)) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados na Vercel" });
  }

  try {
    if (req.method === "GET") {
      const fontes = await listarFontes();
      return res.status(200).json({ ok: true, total: fontes.length, fontes });
    }

    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const inserida = await inserirFonte(body);
      return res.status(201).json({ ok: true, fonte: inserida?.[0] ?? inserida });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método não permitido. Use GET ou POST." });
  } catch (err) {
    console.error("[admin/fontes] erro:", err);
    return res.status(400).json({ ok: false, error: err.message });
  }
}
