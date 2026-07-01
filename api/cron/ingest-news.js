// api/cron/ingest-news.js
//
// Roda conforme schedule configurado (cron-job.org + vercel.json).
// Fluxo: busca fontes ativas -> determina grupo (A/B/C) -> aplica limite
// por grupo -> parseia RSS -> limpa HTML -> extrai imagem -> classifica
// categoria e região/cidade -> insere em `noticias` no Supabase.

import { XMLParser } from "fast-xml-parser";

// ─── Configuração de grupos e limites ──────────────────────────────────────
// Edite aqui para ajustar limites sem alterar a lógica principal.
const GRUPOS = {
  A: {
    nome: "Grandes Portais",
    limite: 10,
    fontes: new Set([
      "O Globo", "Extra", "O Dia", "G1 Rio de Janeiro",
      "G1 Região dos Lagos", "G1 Norte Fluminense",
      "G1 Região Serrana", "G1 Sul do Rio e Costa Verde",
      "R7 Rio de Janeiro", "Diário do Rio",
    ]),
  },
  B: {
    nome: "Portais Regionais",
    limite: 10,
    fontes: new Set([
      "RC24H", "Portal Ururau", "Lagos Informa", "Diário do Vale",
      "O São Gonçalo", "Campos 24Horas", "Expresso Carioca",
      "Jornal Hora H", "Enfoco", "SF Notícias", "RJNEWS",
      "Notícias de Nova Iguaçu", "Notícias da Baixada",
      "Jornal Destaque da Baixada", "Portal Goytacazes",
      "Fonte Certa", "Tribuna Sul Fluminense",
      "A Voz da Serra", "A Voz da Cidade",
      "Rlagos Notícias", "Folha dos Lagos",
      "A Tribuna", "Foco Regional", "Meia Hora",
      "Nova Friburgo em Foco",
    ]),
  },
  C: {
    nome: "Fontes Oficiais",
    limite: 5,
    fontes: new Set([
      "Prefeitura do Rio", "Prefeitura de Niterói",
      "Prefeitura de Cabo Frio", "Prefeitura de Volta Redonda",
      "Prefeitura de Casimiro de Abreu", "Prefeitura de Macaé",
    ]),
  },
};
const LIMITE_PADRAO = 10;

function getLimite(nomefonte) {
  for (const grupo of Object.values(GRUPOS)) {
    if (grupo.fontes.has(nomefonte)) return grupo.limite;
  }
  return LIMITE_PADRAO;
}

// ─── Constantes ────────────────────────────────────────────────────────────
const NOTICIAS_TABLE = "noticias";
const FONTES_TABLE   = "fontes";
const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FEED_API_KEY   = process.env.FEED_API_KEY;
const CRON_SECRET    = process.env.CRON_SECRET;
const FEED_BASE      = "https://rssgenfix-7qjtnnnf.manus.space";

const ALLOWLIST = new Set([
  "g1.globo.com", "noticias.r7.com", "meiahora.com.br",
  "www.meiahora.com.br", "atribunarj.com.br", "folhadoslagos.com",
  "campos24horas.com.br", "ururau.com.br", "focoregional.com.br",
]);

// ─── Utilitários de texto ──────────────────────────────────────────────────
function semAcentos(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function limparHtml(raw) {
  if (!raw) return "";
  let t = String(raw)
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const E = {
    amp:"&", lt:"<", gt:">", quot:'"', apos:"'", nbsp:" ",
    hellip:"…", mdash:"—", ndash:"–", rsquo:"'", lsquo:"'",
    rdquo:"\u201d", ldquo:"\u201c",
  };
  return t.replace(/&([a-zA-Z]+);/g, (m, n) => E[n] ?? m).replace(/\s+/g, " ").trim();
}

// ─── Extração de imagem ────────────────────────────────────────────────────
function extrairImagem(item) {
  const enc = item.enclosure;
  if (enc) {
    const e = Array.isArray(enc) ? enc[0] : enc;
    if (e?.["@_url"]) return e["@_url"];
  }
  for (const tag of ["media:content", "media:thumbnail"]) {
    const m = item[tag];
    if (m) {
      const v = Array.isArray(m) ? m[0] : m;
      if (v?.["@_url"]) return v["@_url"];
    }
  }
  const html = item["content:encoded"] || item.description || "";
  const match = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// ─── Classificação de categoria ────────────────────────────────────────────
const PALAVRAS = {
  "Política":     ["prefeito","prefeitura","vereador","camara municipal","governador","alerj","eleicao","eleitoral","candidato","deputado","senador","ministro","presidente","partido","stf","congresso","secretario","projeto de lei","sancionar","veto"],
  "Economia":     ["economia","emprego","desemprego","investimento","empresa","inflacao","comercio","industria","pib","mercado","negocio","financeiro","imposto","varejo","exportacao","salario","juros"],
  "Segurança":    ["policia","policial","crime","roubo","furto","homicidio","prisao","trafico","violencia","operacao policial","delegacia","assalto","morto a tiros","baleado","assassinado","assassinato","mataram","execucao","tiroteio","vitima fatal","facada","sequestro","milicia","arma de fogo","foragido"],
  "Saúde":        ["saude","hospital","upa","posto de saude","vacina","medico","sus","doenca","covid","dengue","clinica","emergencia","ambulancia","internado","leito","cirurgia","epidemia","surto"],
  "Educação":     ["escola","educacao","aluno","professor","universidade","ensino","matricula","colegio","creche","vestibular","enem","merenda escolar"],
  "Turismo":      ["turismo","turista","turistas","praia","hotel","pousada","viagem","feriado","temporada","ponto turistico","visitantes"],
  "Meio Ambiente":["meio ambiente","sustentabilidade","reciclagem","poluicao","preservacao","ambiental","desmatamento","queimada","incendio florestal","saneamento","residuos solidos","mudanca climatica"],
  "Tecnologia":   ["tecnologia","startup","internet","aplicativo","digital","inovacao","inteligencia artificial","software","ciberseguranca"],
  "Cultura":      ["cultura","show","festival","teatro","musica","cinema","exposicao","artista","carnaval","patrimonio historico","museu","biblioteca","literatura"],
  "Esportes":     ["futebol","esporte","campeonato","jogo","time","atleta","copa","olimpiada","gol","vitoria","derrota","placar","selecao","torcida","estadio","maratona"],
};

function classificarCategoria(titulo, resumo) {
  const t = semAcentos(`${titulo} ${resumo}`.toLowerCase());
  for (const [cat, palavras] of Object.entries(PALAVRAS)) {
    if (palavras.some(p => t.includes(p))) return cat;
  }
  return "Geral";
}

// ─── Detecção de cidade/região ─────────────────────────────────────────────
// Inclui Baixada Fluminense como região própria (separada da Metropolitana)
const CIDADES = [
  // Metropolitana (excluindo Baixada)
  ["rio de janeiro","Rio de Janeiro","metropolitana"],
  ["niteroi","Niterói","metropolitana"],
  ["sao goncalo","São Gonçalo","metropolitana"],
  ["itaborai","Itaboraí","metropolitana"],
  ["marica","Maricá","metropolitana"],
  ["mage","Magé","metropolitana"],
  ["guapimirim","Guapimirim","metropolitana"],
  ["rio bonito","Rio Bonito","metropolitana"],
  // Baixada Fluminense (região própria)
  ["nova iguacu","Nova Iguaçu","baixada"],
  ["duque de caxias","Duque de Caxias","baixada"],
  ["belford roxo","Belford Roxo","baixada"],
  ["nilopolis","Nilópolis","baixada"],
  ["mesquita","Mesquita","baixada"],
  ["queimados","Queimados","baixada"],
  ["sao joao de meriti","São João de Meriti","baixada"],
  ["japeri","Japeri","baixada"],
  ["seropedica","Seropédica","baixada"],
  ["itaguai","Itaguaí","baixada"],
  ["paracambi","Paracambi","baixada"],
  // Lagos
  ["cabo frio","Cabo Frio","lagos"],
  ["arraial do cabo","Arraial do Cabo","lagos"],
  ["buzios","Búzios","lagos"],
  ["armacao dos buzios","Armação dos Búzios","lagos"],
  ["sao pedro da aldeia","São Pedro da Aldeia","lagos"],
  ["araruama","Araruama","lagos"],
  ["iguaba grande","Iguaba Grande","lagos"],
  ["saquarema","Saquarema","lagos"],
  ["silva jardim","Silva Jardim","lagos"],
  ["casimiro de abreu","Casimiro de Abreu","lagos"],
  // Serrana
  ["petropolis","Petrópolis","serrana"],
  ["teresopolis","Teresópolis","serrana"],
  ["nova friburgo","Nova Friburgo","serrana"],
  ["cachoeiras de macacu","Cachoeiras de Macacu","serrana"],
  ["sumidouro","Sumidouro","serrana"],
  ["cordeiro","Cordeiro","serrana"],
  ["bom jardim","Bom Jardim","serrana"],
  // Norte Fluminense
  ["campos dos goytacazes","Campos dos Goytacazes","norte"],
  ["macae","Macaé","norte"],
  ["sao joao da barra","São João da Barra","norte"],
  ["quissama","Quissamã","norte"],
  ["carapebus","Carapebus","norte"],
  ["cardoso moreira","Cardoso Moreira","norte"],
  ["sao fidelis","São Fidélis","norte"],
  // Noroeste
  ["itaperuna","Itaperuna","noroeste"],
  ["santo antonio de padua","Santo Antônio de Pádua","noroeste"],
  ["miracema","Miracema","noroeste"],
  ["natividade","Natividade","noroeste"],
  ["bom jesus do itabapoana","Bom Jesus do Itabapoana","noroeste"],
  ["porciuncula","Porciúncula","noroeste"],
  // Costa Verde
  ["angra dos reis","Angra dos Reis","costa-verde"],
  ["paraty","Paraty","costa-verde"],
  ["mangaratiba","Mangaratiba","costa-verde"],
  // Médio Paraíba
  ["volta redonda","Volta Redonda","medio-paraiba"],
  ["barra mansa","Barra Mansa","medio-paraiba"],
  ["resende","Resende","medio-paraiba"],
  ["barra do pirai","Barra do Piraí","medio-paraiba"],
  ["pinheiral","Pinheiral","medio-paraiba"],
  ["itatiaia","Itatiaia","medio-paraiba"],
  // Centro-Sul
  ["vassouras","Vassouras","centro-sul"],
  ["valenca","Valença","centro-sul"],
  ["miguel pereira","Miguel Pereira","centro-sul"],
  ["paty do alferes","Paty do Alferes","centro-sul"],
  ["mendes","Mendes","centro-sul"],
];

function detectarCidadeRegiao(titulo, resumo) {
  const t = semAcentos(`${titulo} ${resumo}`.toLowerCase());
  for (const [match, nome, regiao] of CIDADES) {
    if (t.includes(match)) return { cidade: nome, regiao };
  }
  return null;
}

function regiaoFallback(regiaoFonte) {
  if (!regiaoFonte) return "metropolitana";
  const r = semAcentos(regiaoFonte.toLowerCase());
  if (r.includes("baixada"))                          return "baixada";
  if (r.includes("lagos"))                            return "lagos";
  if (r.includes("serrana"))                          return "serrana";
  if (r.includes("noroeste"))                         return "noroeste";
  if (r.includes("norte"))                            return "norte";
  if (r.includes("costa verde") || r.includes("sul")) return "costa-verde";
  if (r.includes("paraiba"))                          return "medio-paraiba";
  if (r.includes("centro-sul") || r.includes("centro sul")) return "centro-sul";
  return "metropolitana";
}

// ─── Fontes ────────────────────────────────────────────────────────────────
function normalizarUrl(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getEstrategia(fonte) {
  if (fonte.rss_url) return "rss_nativo";
  if (!fonte.url) return "sem_suporte";
  try {
    const host = new URL(normalizarUrl(fonte.url)).hostname;
    if ([...ALLOWLIST].some(d => host.includes(d))) return "scraping_manus";
  } catch { /* continua */ }
  return "sem_suporte";
}

async function fetchFontesAtivas() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${FONTES_TABLE}?select=id,nome,url,rss_url,regiao,ativo&ativo=eq.true`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Fontes: ${res.status}`);
  return res.json();
}

async function fetchRssNativo(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) { console.error(`RSS ${url}: ${res.status}`); return null; }
  return res.text();
}

async function fetchFeedXml(sourceUrl) {
  const url = `${FEED_BASE}/api/feed?url=${encodeURIComponent(sourceUrl)}&key=${FEED_API_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) { console.error(`Feed ${sourceUrl}: ${res.status}`); return null; }
  return res.text();
}

function parseRssItems(xml) {
  const json = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const items = json?.rss?.channel?.item || [];
  return Array.isArray(items) ? items : [items];
}

// ─── Inserção ──────────────────────────────────────────────────────────────
async function upsertNoticias(items, fonte, limite) {
  const fatia = items.slice(0, limite);
  if (!fatia.length) return 0;

  const rows = fatia.map(item => {
    const titulo  = limparHtml(item.title);
    const resumo  = limparHtml(item.description);
    const loc     = detectarCidadeRegiao(titulo, resumo);
    return {
      titulo,
      resumo,
      url_original:   item.link || "",
      fonte_id:       fonte.id,
      fonte_nome:     fonte.nome,
      regiao:         loc ? loc.regiao : regiaoFallback(fonte.regiao),
      cidade:         loc ? loc.cidade : null,
      categoria:      classificarCategoria(titulo, resumo),
      imagem_url:     extrairImagem(item),
      data_publicacao: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      processado_ia:  false,
    };
  });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${NOTICIAS_TABLE}?on_conflict=url_original`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify(rows),
    }
  );
  if (!res.ok) {
    console.error(`Insert ${fonte.nome}: ${res.status} ${await res.text().catch(() => "")}`);
    return 0;
  }
  return rows.length;
}

function getLimite(nomeF) {
  for (const grupo of Object.values(GRUPOS)) {
    if (grupo.fontes.has(nomeF)) return grupo.limite;
  }
  return LIMITE_PADRAO;
}

// ─── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const tokenHeader = req.headers.authorization === `Bearer ${CRON_SECRET}`;
  const tokenQuery  = req.query?.key === CRON_SECRET;
  if (CRON_SECRET && !tokenHeader && !tokenQuery) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const fontes = await fetchFontesAtivas();
    let totalInseridas = 0;
    const resultados = [];

    for (const fonte of fontes) {
      const estrategia = getEstrategia(fonte);
      if (estrategia === "sem_suporte") {
        resultados.push({ fonte: fonte.nome, status: "sem_suporte" });
        continue;
      }

      const xml = estrategia === "rss_nativo"
        ? await fetchRssNativo(fonte.rss_url)
        : await fetchFeedXml(normalizarUrl(fonte.url));

      if (!xml) {
        resultados.push({ fonte: fonte.nome, status: "erro_fetch", estrategia });
        continue;
      }

      const items    = parseRssItems(xml);
      const limite   = getLimite(fonte.nome);
      const inseridas = await upsertNoticias(items, fonte, limite);
      totalInseridas += inseridas;
      resultados.push({ fonte: fonte.nome, estrategia, grupo: getGrupo(fonte.nome), itens: items.length, limite, inseridas });
    }

    return res.status(200).json({ ok: true, totalFontes: fontes.length, totalInseridas, resultados });
  } catch (err) {
    console.error("Cron error:", err);
    return res.status(500).json({ error: err.message });
  }
}

function getGrupo(nome) {
  for (const [id, g] of Object.entries(GRUPOS)) {
    if (g.fontes.has(nome)) return id;
  }
  return "B";
}
