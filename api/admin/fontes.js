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
//   ("ativo" default true, "regiao" default "metropolitana"). Se já existir
//   uma fonte com a mesma "url" ou "rss_url", retorna a existente em vez de
//   duplicar (campo "duplicada": true na resposta).
//
// PATCH /api/admin/fontes?key=SEU_SECRET
//   Body JSON: { "id": 150, "rss_url": "...", "url": "...", "nome": "...", "regiao": "...", "ativo": true }
//   Atualiza campos de uma fonte já existente, identificada por "id".
//   Só os campos enviados são alterados; o resto permanece como estava.
//
// Este endpoint é uma solução provisória enquanto o acesso ao painel do
// Supabase não é restaurado. Depois de resolvido, pode ser mantido (é útil
// para automações futuras, como o conector do FeedForge) ou removido sem
// afetar o restante do pipeline.

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

async function buscarFontePorUrl(url, rss_url) {
  const filtros = [];
  if (url) filtros.push(`url.eq.${encodeURIComponent(url)}`);
  if (rss_url) filtros.push(`rss_url.eq.${encodeURIComponent(rss_url)}`);
  if (filtros.length === 0) return null;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${FONTES_TABLE}?select=id,nome,url,rss_url,ativo,status&or=(${filtros.join(",")})&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Falha ao checar duplicidade: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows[0] || null;
}

async function inserirFonte(payload) {
  const { nome, url, rss_url, regiao, ativo } = payload || {};

  if (!nome || typeof nome !== "string") {
    throw new Error("Campo obrigatório ausente ou inválido: nome");
  }
  if (!url && !rss_url) {
    throw new Error("Informe ao menos um dos campos: url ou rss_url");
  }

  const urlNormalizada = url ? normalizarUrl(url.trim()) : null;
  const rssNormalizada = rss_url ? normalizarUrl(rss_url.trim()) : null;

  const existente = await buscarFontePorUrl(urlNormalizada, rssNormalizada);
  if (existente) {
    const erro = new Error("Fonte já cadastrada");
    erro.duplicada = existente;
    throw erro;
  }

  const corpo = {
    nome: nome.trim(),
    url: urlNormalizada,
    rss_url: rssNormalizada,
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

async function atualizarFonte(id, payload) {
  if (!id) throw new Error("Campo obrigatório ausente: id");

  const { nome, url, rss_url, regiao, ativo } = payload || {};
  const corpo = {};
  if (nome !== undefined) corpo.nome = String(nome).trim();
  if (url !== undefined) corpo.url = url ? normalizarUrl(String(url).trim()) : null;
  if (rss_url !== undefined) corpo.rss_url = rss_url ? normalizarUrl(String(rss_url).trim()) : null;
  if (regiao !== undefined) corpo.regiao = String(regiao).trim();
  if (ativo !== undefined) corpo.ativo = Boolean(ativo);

  if (Object.keys(corpo).length === 0) {
    throw new Error("Nenhum campo para atualizar foi enviado");
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${FONTES_TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(corpo),
  });

  if (!res.ok) {
    throw new Error(`Falha ao atualizar fonte: ${res.status} ${await res.text()}`);
  }
  const rows = await res.json();
  if (rows.length === 0) throw new Error(`Nenhuma fonte encontrada com id ${id}`);
  return rows[0];
}

function aplicarCors(res) {
  // Permite que a ferramenta local (arquivo HTML aberto no celular, fora do
  // domínio da Vercel) consiga chamar este endpoint. O segredo em si (query
  // "?key=") continua sendo a proteção real; isso só libera o navegador a
  // fazer a chamada.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  aplicarCors(res);

  if (req.method === "OPTIONS") {
    // Requisição de "preflight" que o navegador dispara automaticamente
    // antes de um POST/PATCH com JSON. Só precisa responder OK, sem corpo.
    return res.status(204).end();
  }

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
      try {
        const inserida = await inserirFonte(body);
        return res.status(201).json({ ok: true, duplicada: false, fonte: inserida?.[0] ?? inserida });
      } catch (err) {
        if (err.duplicada) {
          return res.status(200).json({ ok: true, duplicada: true, fonte: err.duplicada });
        }
        throw err;
      }
    }

    if (req.method === "PATCH") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const { id, ...campos } = body || {};
      const atualizada = await atualizarFonte(id, campos);
      return res.status(200).json({ ok: true, fonte: atualizada });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Método não permitido. Use GET, POST ou PATCH." });
  } catch (err) {
    console.error("[admin/fontes] erro:", err);
    return res.status(400).json({ ok: false, error: err.message });
  }
}
