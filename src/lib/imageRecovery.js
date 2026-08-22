// src/lib/imageRecovery.js
import { extractImageFromHtml, isImageUrlValid } from "./imageExtraction.js";

// Módulo único e centralizado de recuperação inteligente de imagens.
// Ordem: RSS -> Open Graph -> primeira imagem do conteúdo -> fallback por categoria.
// Nenhuma fonte tem lógica própria — tudo passa por recoverImage(noticia).

const FALLBACK_BASE_PATH = "/fallbacks";

// Manifesto único das artes institucionais disponíveis. Para adicionar uma
// categoria nova, basta colocar o slug aqui (e subir o .webp correspondente).
// O módulo NÃO mantém uma lista própria de categorias válidas — ele apenas
// normaliza o texto que a classificação de ingest-news.js já produz.
const FALLBACK_MANIFEST = new Set([
  "saude",
  "educacao",
  "politica",
  "seguranca",
  "turismo",
  "economia",
  "cultura",
  "tecnologia",
  "meio-ambiente",
  "esporte",
  "geral",
  // "mobilidade" ainda não tem arte própria -> cai em "geral" até ser criada.
]);

// Ajustes de nome pra bater categoria (plural/composta) com arquivo (singular/kebab).
const SLUG_ALIASES = {
  esportes: "esporte",
};

function slugify(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getFallbackImage(categoria) {
  const slug = slugify(categoria);
  const resolved = SLUG_ALIASES[slug] || slug;
  const final = FALLBACK_MANIFEST.has(resolved) ? resolved : "geral";
  return `${FALLBACK_BASE_PATH}/${final}.webp`;
}

// ─── Estatísticas em memória (por execução do cron) ────────────────────────
export const stats = { rss: 0, og: 0, conteudo: 0, fallback: 0, total: 0, falhas: 0 };

export function resetStats() {
  stats.rss = 0;
  stats.og = 0;
  stats.conteudo = 0;
  stats.fallback = 0;
  stats.total = 0;
  stats.falhas = 0;
}

export function getStatsResumo() {
  const total = stats.total || 1;
  return {
    ...stats,
    percentualRecuperado: Number((((stats.rss + stats.og + stats.conteudo) / total) * 100).toFixed(1)),
  };
}

// ─── Validação simples ──────────────────────────────────────────────────────
function isImagemValida(url) {
  return isImageUrlValid(url);
}

// ─── Etapa 1: RSS (já extraído em ingest-news.js, aqui só validamos) ───────
function tentarRss(noticia) {
  if (isImagemValida(noticia.imagem_url)) {
    return { imagem_url: noticia.imagem_url, imagem_origem: "rss" };
  }
  return null;
}

// ─── Etapa 2: Open Graph ────────────────────────────────────────────────────
function extrairOgImage(html, baseUrl) {
  return extractImageFromHtml(html, baseUrl);
}

// ─── Etapa 3: primeira imagem relevante do conteúdo ────────────────────────
function extrairPrimeiraImagemConteudo(html, baseUrl) {
  return extractImageFromHtml(html, baseUrl);
}

async function buscarHtmlDaNoticia(url, timeoutMs = 6000) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ─── Etapa 4: fallback institucional por categoria ─────────────────────────
function aplicarFallback(noticia) {
  // Não usamos mais getFallbackImage() para preencher imagem_url — a ausência
  // de imagem real passa a ser um estado explícito (imagem_url = null), e o
  // frontend decide como apresentar isso. imagem_origem continua "fallback"
  // para preservar o registro de que a recuperação foi tentada e não achou
  // imagem real (getFallbackImage/FALLBACK_MANIFEST permanecem disponíveis
  // no módulo, sem uso automático aqui).
  return { imagem_url: null, imagem_origem: "fallback" };
}

// ─── Função principal ───────────────────────────────────────────────────────
export async function recoverImage(noticia) {
  const inicio = Date.now();
  const ctx = { fonte: noticia.fonte_nome, titulo: noticia.titulo, url: noticia.url_original };

  const viaRss = tentarRss(noticia);
  if (viaRss) {
    stats.rss++; stats.total++;
    console.log(`[imageRecovery] RSS | ${ctx.fonte} | ${ctx.titulo} | ${Date.now() - inicio}ms`);
    return viaRss;
  }

  if (!noticia.url_original) {
    stats.fallback++; stats.total++; stats.falhas++;
    return aplicarFallback(noticia);
  }

  const html = await buscarHtmlDaNoticia(noticia.url_original);
  if (!html) {
    stats.fallback++; stats.total++; stats.falhas++;
    console.warn(`[imageRecovery] FALHA(fetch) | ${ctx.fonte} | ${ctx.titulo} | ${Date.now() - inicio}ms`);
    return aplicarFallback(noticia);
  }

  const og = extrairOgImage(html, noticia.url_original);
  if (isImagemValida(og)) {
    stats.og++; stats.total++;
    console.log(`[imageRecovery] OG | ${ctx.fonte} | ${ctx.titulo} | ${Date.now() - inicio}ms`);
    return { imagem_url: og, imagem_origem: "og" };
  }

  const doConteudo = extrairPrimeiraImagemConteudo(html, noticia.url_original);
  if (isImagemValida(doConteudo)) {
    stats.conteudo++; stats.total++;
    console.log(`[imageRecovery] CONTEUDO | ${ctx.fonte} | ${ctx.titulo} | ${Date.now() - inicio}ms`);
    return { imagem_url: doConteudo, imagem_origem: "conteudo" };
  }

  stats.fallback++; stats.total++;
  console.log(`[imageRecovery] FALLBACK | ${ctx.fonte} | ${ctx.titulo} | ${Date.now() - inicio}ms`);
  return aplicarFallback(noticia);
    }
  
