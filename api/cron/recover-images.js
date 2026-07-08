// api/cron/recover-images.js
//
// Fase 2 do módulo de recuperação de imagens.
// Endpoint independente, disparado por um agendador externo (cron-job.org,
// Vercel Cron, etc). Busca notícias marcadas como imagem_pendente = true
// e tenta novamente OG/conteúdo. Desiste após MAX_TENTATIVAS_RECUPERACAO
// tentativas, mantendo o fallback institucional permanentemente.

import { recoverImage } from "../../src/lib/imageRecovery.js";

const NOTICIAS_TABLE = "noticias";
const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET    = process.env.CRON_SECRET;

const MAX_RECUPERACOES_POR_EXECUCAO =
  Number(process.env.MAX_RECUPERACOES_POR_EXECUCAO) || 30;

const MAX_TENTATIVAS_RECUPERACAO =
  Number(process.env.MAX_TENTATIVAS_RECUPERACAO) || 5;

async function fetchPendentes(limite) {
  const url =
    `${SUPABASE_URL}/rest/v1/${NOTICIAS_TABLE}` +
    `?select=id,titulo,fonte_nome,url_original,categoria,tentativas_recuperacao` +
    `&imagem_pendente=eq.true` +
    `&order=tentativas_recuperacao.asc` +
    `&limit=${limite}`;

  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Fetch pendentes: ${res.status}`);
  return res.json();
}

async function atualizarNoticia(id, patch) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${NOTICIAS_TABLE}?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) {
    console.error(`Update noticia ${id}: ${res.status} ${await res.text().catch(() => "")}`);
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  const tokenHeader = req.headers.authorization === `Bearer ${CRON_SECRET}`;
  const tokenQuery  = req.query?.key === CRON_SECRET;
  if (CRON_SECRET && !tokenHeader && !tokenQuery) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const pendentes = await fetchPendentes(MAX_RECUPERACOES_POR_EXECUCAO);

    let recuperadas = 0;
    let aindaPendentes = 0;
    let desistidas = 0;
    const detalhes = [];

    for (const noticia of pendentes) {
      const alvo = { ...noticia, imagem_url: null };
      const resultado = await recoverImage(alvo);

      if (resultado.imagem_origem !== "fallback") {
        await atualizarNoticia(noticia.id, {
          imagem_url: resultado.imagem_url,
          imagem_origem: resultado.imagem_origem,
          imagem_pendente: false,
        });
        recuperadas++;
        detalhes.push({ id: noticia.id, titulo: noticia.titulo, status: "recuperada", metodo: resultado.imagem_origem });
        continue;
      }

      const tentativas = (noticia.tentativas_recuperacao || 0) + 1;
      const desistir = tentativas >= MAX_TENTATIVAS_RECUPERACAO;

      await atualizarNoticia(noticia.id, {
        tentativas_recuperacao: tentativas,
        imagem_pendente: !desistir,
      });

      if (desistir) {
        desistidas++;
        detalhes.push({ id: noticia.id, titulo: noticia.titulo, status: "desistida_apos_tentativas", tentativas });
      } else {
        aindaPendentes++;
        detalhes.push({ id: noticia.id, titulo: noticia.titulo, status: "ainda_pendente", tentativas });
      }
    }

    return res.status(200).json({
      ok: true,
      processadas: pendentes.length,
      recuperadas,
      aindaPendentes,
      desistidas,
      detalhes,
    });
  } catch (err) {
    console.error("Recover-images error:", err);
    return res.status(500).json({ error: err.message });
  }
}
