// api/cron/ingest-news.js
//
// Roda conforme schedule configurado (cron-job.org + vercel.json).
// Inclui: grupos de fontes com limites, limpeza HTML, extração de imagem,
// classificação de categoria (inclui Mobilidade), detecção de cidade/região,
// recuperação inteligente de imagens (RSS -> OG -> conteúdo -> fallback,
// com fila de pendentes para a Fase 2 em recover-images.js),
// registro de saúde das fontes em `fontes_saude`, e alertas automáticos:
//   - falha_fetch:   3+ falhas consecutivas ao buscar o feed
//   - zero_itens:    feed responde, mas 0 itens novos são inseridos
//                     (feed "congelado", caso descoberto com O Dia)
//   - queda_volume:  volume inserido muito abaixo da média histórica da fonte

import { XMLParser } from "fast-xml-parser";
import { recoverImage, getFallbackImage, resetStats, getStatsResumo } from "../../src/lib/imageRecovery.js";

// ─── Proteção contra timeout (Vercel Hobby) ────────────────────────────────
const MAX_RECUPERACOES_POR_EXECUCAO =
  Number(process.env.MAX_RECUPERACOES_POR_EXECUCAO) || 30;
let recuperacoesUsadas = 0;

// ─── Alertas ────────────────────────────────────────────────────────────────
const LIMITE_FALHAS_PARA_ALERTA = 3;

// ─── Grupos de fontes e limites ────────────────────────────────────────────
const GRUPOS = {
  A: {
    nome: "Grandes Portais (volume alto)",
    limite: 15,
    fontes: new Set([
      "O Globo", "Extra", "O Dia",
    ]),
  },
  A2: {
    nome: "Grandes Portais (demais)",
    limite: 10,
    fontes: new Set([
      "G1 Rio de Janeiro", "G1 Região dos Lagos", "G1 Norte Fluminense",
      "G1 Região Serrana", "G1 Sul do Rio e Costa Verde",
      "R7 Rio de Janeiro", "Diário do Rio",
      "TechTudo", "Canaltech", "TecMundo", "CinePOP",
    ]),
  },
  B: {
    nome: "Portais Regionais",
    limite: 10,
    fontes: new Set([
      "Veja Rio", "Jornal Rio", "Rio em Foco", "Rio Notícias",
      "Voz das Comunidades", "Cidade de Niterói", "O Fluminense",
      "A Voz da Serra", "Prensa de Babel", "RJ Costa Verde",
      "Folha de Italva", "Povo na Rua",
      "RC24H", "Portal Ururau", "Lagos Informa", "Diário do Vale",
      "O São Gonçalo", "Expresso Carioca", "Jornal Hora H",
      "Notícias de Nova Iguaçu", "Notícias da Baixada",
      "Jornal Destaque da Baixada", "Portal Goytacazes",
      "Fonte Certa", "Tribuna Sul Fluminense",
      "Folha dos Lagos", "Portal Viu", "Clique Diário",
      "Tempo Real RJ", "Manchete RJ", "Jornal do Estado RJ",
      "Revista Ana Maria", "Contigo", "Blog do Artesanato",
      "Futuro da Saúde", "Tempo.com", "Sebrae RJ",
      "Net Vasco", "Fogão Net", "Coluna do Fla", "Net Flu",
      "Carnavalesco",
      "Serra News RJ", "Jornal do Estado do Rio", "Net Diário",
      "RJ Interior", "Folha do Interior", "A Cidade Costa Verde",
      "Diário Carioca", "Agenda do Poder", "Rádio Tupi", "América Rio",
    ]),
  },
  C: {
    nome: "Fontes Oficiais",
    limite: 7,
    fontes: new Set([
      "Prefeitura de São Francisco de Itabapoana", "Prefeitura de São João de Meriti",
      "Prefeitura de São Pedro da Aldeia", "Prefeitura de Saquarema",
      "Prefeitura de Sumidouro",
      "Prefeitura do Rio", "Prefeitura de Niterói",
      "Prefeitura de Cabo Frio", "Prefeitura de Volta Redonda",
      "Prefeitura de Casimiro de Abreu", "Prefeitura de Macaé",
      "Prefeitura de Japeri", "Prefeitura de Mangaratiba",
      "Prefeitura de Maricá", "Prefeitura de Cabo Frio (Oficial)",
      "Prefeitura de Nilópolis", "Prefeitura de Paracambi",
      "Prefeitura de Porciúncula", "Prefeitura de Quatis",
      "Prefeitura de Queimados", "Prefeitura de Quissamã",
      "Prefeitura de Rio Bonito",
    ]),
  },
  C2: {
    nome: "Fontes Oficiais (volume fixo)",
    limite: 5,
    fontes: new Set([
      "Centro de Operações Rio",
    ]),
  },
  D: {
    nome: "Fontes Genéricas (nacionais)",
    limite: 5,
    fontes: new Set([
      "Monitor Mercantil", "Fecomércio-RJ", "Revista Oeste (RJ)", "Monitor Econômico",
      "Tua Saúde", "Guia do Estudante (Abril)", "Fuxico TV", "Caras",
      "Revista PEGN (Globo)", "Saúde Abril", "Casa da Ciência", "InfoMoney",
    ]),
  },
};
const LIMITE_PADRAO = 10;

function getLimite(nome) {
  for (const g of Object.values(GRUPOS)) {
    if (g.fontes.has(nome)) return g.limite;
  }
  return LIMITE_PADRAO;
}

function getGrupo(nome) {
  for (const [id, g] of Object.entries(GRUPOS)) {
    if (g.fontes.has(nome)) return id;
  }
  return "B";
}

// ─── Constantes ────────────────────────────────────────────────────────────
const NOTICIAS_TABLE  = "noticias";
const FONTES_TABLE    = "fontes";
const SAUDE_TABLE     = "fontes_saude";
const ALERTAS_TABLE   = "alertas_fontes";
const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FEED_API_KEY    = process.env.FEED_API_KEY;
const CRON_SECRET     = process.env.CRON_SECRET;
const FEED_BASE       = "https://rssgenfix-7qjtnnnf.manus.space";

const ALLOWLIST = new Set([
  "g1.globo.com", "noticias.r7.com", "meiahora.com.br",
  "www.meiahora.com.br", "atribunarj.com.br", "folhadoslagos.com",
  "campos24horas.com.br", "ururau.com.br", "focoregional.com.br",
]);

// ─── Utilitários ────────────────────────────────────────────────────────────
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

// ─── Extração de imagem (Etapa 1 do módulo de recuperação) ─────────────────
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
  "Mobilidade":   ["transito","congestionamento","interdicao","bloqueio","acidente de transito","obra na via","desvio","sinal","semaforo","onibus","metro","trem","barca","brt","vlt","rodovia","autoestrada","ponte","tunel","via expressa","presidente dutra","linha amarela","linha vermelha","alerj trafego","trafego","estacionamento","multa de transito","licenciamento","ipva","detran"],
  "Política":     ["prefeito","prefeitura","vereador","camara municipal","governador","alerj","eleicao","eleitoral","candidato","deputado","senador","ministro","presidente","partido","stf","congresso","secretario","projeto de lei","sancionar","veto","licitacao","concurso publico"],
  "Economia":     ["economia","emprego","desemprego","investimento","empresa","inflacao","comercio","industria","pib","mercado","negocio","financeiro","imposto","varejo","exportacao","salario","juros","sebrae","empreendedor","startup"],
  "Segurança":    ["policia","policial","crime","roubo","furto","homicidio","prisao","trafico","violencia","operacao policial","delegacia","assalto","morto a tiros","baleado","assassinado","assassinato","mataram","execucao","tiroteio","vitima fatal","facada","sequestro","milicia","arma de fogo","foragido"],
  "Saúde":        ["saude","hospital","upa","posto de saude","vacina","medico","sus","doenca","covid","dengue","clinica","emergencia","ambulancia","internado","leito","cirurgia","epidemia","surto"],
  "Educação":     ["escola","educacao","aluno","professor","universidade","ensino","matricula","colegio","creche","vestibular","enem","merenda escolar"],
  "Turismo":      ["turismo","turista","turistas","praia","hotel","pousada","viagem","feriado","temporada","ponto turistico","visitantes","carnaval","festa","festival"],
  "Meio Ambiente":["meio ambiente","sustentabilidade","reciclagem","poluicao","preservacao","ambiental","desmatamento","queimada","incendio florestal","saneamento","residuos solidos","mudanca climatica","enchente","alagamento","deslizamento"],
  "Tecnologia":   ["tecnologia","startup","internet","aplicativo","digital","inovacao","inteligencia artificial","software","ciberseguranca"],
  "Cultura":      ["cultura","show","teatro","musica","cinema","exposicao","artista","patrimonio historico","museu","biblioteca","literatura","artesanato"],
  "Esportes":     ["futebol","esporte","campeonato","jogo","time","atleta","copa","olimpiada","gol","vitoria","derrota","placar","selecao","torcida","estadio","maratona","vasco","flamengo","fluminense","botafogo","america"],
};

function classificarCategoria(titulo, resumo) {
  const t = semAcentos(`${titulo} ${resumo}`.toLowerCase());
  for (const [cat, palavras] of Object.entries(PALAVRAS)) {
    if (palavras.some(p => t.includes(p))) return cat;
  }
  return "Geral";
}

// ─── Detecção de cidade/região ─────────────────────────────────────────────
const CIDADES = [
  ["rio de janeiro","Rio de Janeiro","metropolitana"],
  ["niteroi","Niterói","metropolitana"],
  ["sao goncalo","São Gonçalo","metropolitana"],
  ["itaborai","Itaboraí","metropolitana"],
  ["marica","Maricá","metropolitana"],
  ["mage","Magé","metropolitana"],
  ["guapimirim","Guapimirim","metropolitana"],
  ["rio bonito","Rio Bonito","metropolitana"],
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
  ["cabo frio","Cabo Frio","lagos"],
  ["arraial do cabo","Arraial do Cabo","lagos"],
  ["buzios","Búzios","lagos"],
  ["armacao dos buzios","Armação dos Búzios","lagos"],
  ["sao pedro da aldeia","São Pedro da Aldeia","lagos"],
  ["araruama","Araruama","lagos"],
  ["iguaba grande","Iguaba Grande","lagos"],
  ["saquarema","Saquarema","lagos"],
  ["casimiro de abreu","Casimiro de Abreu","lagos"],
  ["petropolis","Petrópolis","serrana"],
  ["teresopolis","Teresópolis","serrana"],
  ["nova friburgo","Nova Friburgo","serrana"],
  ["cachoeiras de macacu","Cachoeiras de Macacu","serrana"],
  ["cordeiro","Cordeiro","serrana"],
  ["bom jardim","Bom Jardim","serrana"],
  ["campos dos goytacazes","Campos dos Goytacazes","norte"],
  ["macae","Macaé","norte"],
  ["sao joao da barra","São João da Barra","norte"],
  ["quissama","Quissamã","norte"],
  ["itaperuna","Itaperuna","noroeste"],
  ["santo antonio de padua","Santo Antônio de Pádua","noroeste"],
  ["miracema","Miracema","noroeste"],
  ["natividade","Natividade","noroeste"],
  ["porciuncula","Porciúncula","noroeste"],
  ["angra dos reis","Angra dos Reis","costa-verde"],
  ["paraty","Paraty","costa-verde"],
  ["mangaratiba","Mangaratiba","costa-verde"],
  ["volta redonda","Volta Redonda","medio-paraiba"],
  ["barra mansa","Barra Mansa","medio-paraiba"],
  ["resende","Resende","medio-paraiba"],
  ["itatiaia","Itatiaia","medio-paraiba"],
  ["quatis","Quatis","medio-paraiba"],
  ["vassouras","Vassouras","centro-sul"],
  ["valenca","Valença","centro-sul"],
  ["miguel pereira","Miguel Pereira","centro-sul"],
];

function detectarCidadeRegiao(titulo, resumo) {
  const t = semAcentos(`${titulo} ${resumo}`.toLowerCase());
  for (const [match, nome, regiao] of CIDADES) {
    if (t.includes(match)) return { cidade: nome, regiao };
  }
  return null;
}

function regiaoFallback(r) {
  if (!r) return "metropolitana";
  const s = semAcentos(r.toLowerCase());
  if (s.includes("baixada"))    return "baixada";
  if (s.includes("lagos"))      return "lagos";
  if (s.includes("serrana"))    return "serrana";
  if (s.includes("noroeste"))   return "noroeste";
  if (s.includes("norte"))      return "norte";
  if (s.includes("costa verde") || s.includes("costa-verde")) return "costa-verde";
  if (s.includes("paraiba"))    return "medio-paraiba";
  if (s.includes("centro-sul") || s.includes("centro sul")) return "centro-sul";
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
    `${SUPABASE_URL}/rest/v1/${FONTES_TABLE}?select=id,nome,url,rss_url,regiao,ativo,falhas_consecutivas_atual,zero_itens_consecutivo,queda_volume_consecutivo&ativo=eq.true`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Fontes: ${res.status}`);
  return res.json();
}

async function fetchMediaItens() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/fontes_media_itens?select=fonte_id,media_itens`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) { console.error(`Media itens: ${res.status}`); return new Map(); }
  const data = await res.json();
  return new Map(data.map(r => [r.fonte_id, Number(r.media_itens)]));
}

async function fetchRssNativo(url) {
  const inicio = Date.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const ms = Date.now() - inicio;
  if (!res.ok) return { xml: null, ms };
  return { xml: await res.text(), ms };
}

async function fetchFeedXml(sourceUrl) {
  const inicio = Date.now();
  const url = `${FEED_BASE}/api/feed?url=${encodeURIComponent(sourceUrl)}&key=${FEED_API_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const ms = Date.now() - inicio;
  if (!res.ok) return { xml: null, ms };
  return { xml: await res.text(), ms };
}

function parseRssItems(xml) {
  const json = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const items = json?.rss?.channel?.item || [];
  return Array.isArray(items) ? items : [items];
}

// ─── Inserção de notícias (com recuperação de imagem + fila de pendentes) ──
async function upsertNoticias(items, fonte, limite) {
  const fatia = items.slice(0, limite);
  if (!fatia.length) return 0;

  const rowsBase = fatia.map(item => {
    const titulo = limparHtml(item.title);
    const resumo = limparHtml(item.description);
    const loc    = detectarCidadeRegiao(titulo, resumo);
    return {
      titulo, resumo,
      url_original:    item.link || "",
      fonte_id:        fonte.id,
      fonte_nome:      fonte.nome,
      regiao:          loc ? loc.regiao : regiaoFallback(fonte.regiao),
      cidade:          loc ? loc.cidade : null,
      categoria:       classificarCategoria(titulo, resumo),
      imagem_url:      extrairImagem(item),
      imagem_origem:   null,
      imagem_pendente: false,
      tentativas_recuperacao: 0,
      data_publicacao: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      processado_ia:   false,
    };
  });

  const rows = await Promise.all(rowsBase.map(async row => {
    if (row.imagem_url) {
      row.imagem_origem = "rss";
      row.imagem_pendente = false;
      return row;
    }

    if (recuperacoesUsadas >= MAX_RECUPERACOES_POR_EXECUCAO) {
      row.imagem_url = getFallbackImage(row.categoria);
      row.imagem_origem = "fallback";
      row.imagem_pendente = true;
      return row;
    }

    recuperacoesUsadas++;
    const resultado = await recoverImage(row);
    row.imagem_url = resultado.imagem_url;
    row.imagem_origem = resultado.imagem_origem;
    row.imagem_pendente = resultado.imagem_origem === "fallback";
    return row;
  }));

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

// ─── Registro de saúde ─────────────────────────────────────────────────────
async function registrarSaude(registros) {
  if (!registros.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${SAUDE_TABLE}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(registros),
  });
  if (!res.ok) console.error(`Saúde insert: ${res.status}`);
}

// ─── Alertas de fontes ──────────────────────────────────────────────────────
async function patchFonte(id, patch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${FONTES_TABLE}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) console.error(`Patch fonte ${id}: ${res.status}`);
}

async function criarAlerta(fonte, contagem, tipo, detalhe) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${ALERTAS_TABLE}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([{
      fonte_id: fonte.id,
      fonte_nome: fonte.nome,
      falhas_consecutivas: contagem,
      tipo,
      detalhe,
    }]),
  });
  if (!res.ok) console.error(`Criar alerta ${fonte.nome} (${tipo}): ${res.status}`);
}

async function resolverAlerta(fonteId, tipo) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${ALERTAS_TABLE}?fonte_id=eq.${fonteId}&resolvido=eq.false&tipo=eq.${tipo}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ resolvido: true, resolvido_em: new Date().toISOString() }),
    }
  );
  if (!res.ok) console.error(`Resolver alerta fonte ${fonteId} (${tipo}): ${res.status}`);
}

// Falhas de fetch (erro_fetch consecutivo).
async function atualizarStatusFalha(fonte, sucesso) {
  const atual = fonte.falhas_consecutivas_atual || 0;

  if (sucesso) {
    if (atual > 0) {
      await patchFonte(fonte.id, { falhas_consecutivas_atual: 0 });
      if (atual >= LIMITE_FALHAS_PARA_ALERTA) await resolverAlerta(fonte.id, "falha_fetch");
    }
    return;
  }

  const novo = atual + 1;
  await patchFonte(fonte.id, { falhas_consecutivas_atual: novo });
  if (novo === LIMITE_FALHAS_PARA_ALERTA) {
    await criarAlerta(fonte, novo, "falha_fetch", `${novo} falhas consecutivas ao buscar o feed.`);
  }
}

// Feed "congelado" (responde, mas 0 itens novos) e queda de volume vs.
// média histórica da própria fonte.
async function atualizarStatusVolume(fonte, itemsCount, inseridas, media) {
  const zeroAtual = fonte.zero_itens_consecutivo || 0;
  const quedaAtual = fonte.queda_volume_consecutivo || 0;

  const ehZeroItens = itemsCount > 0 && inseridas === 0;
  if (ehZeroItens) {
    const novo = zeroAtual + 1;
    await patchFonte(fonte.id, { zero_itens_consecutivo: novo });
    if (novo === LIMITE_FALHAS_PARA_ALERTA) {
      await criarAlerta(fonte, novo, "zero_itens",
        `Feed respondeu com ${itemsCount} itens, mas 0 foram inseridos como novos em ${novo} execuções seguidas (possível conteúdo congelado).`);
    }
  } else if (zeroAtual > 0) {
    await patchFonte(fonte.id, { zero_itens_consecutivo: 0 });
    if (zeroAtual >= LIMITE_FALHAS_PARA_ALERTA) await resolverAlerta(fonte.id, "zero_itens");
  }

  // Só avalia queda de volume quando não é já um caso de zero_itens (evita
  // dois alertas simultâneos pro mesmo sintoma) e quando existe média
  // histórica minimamente relevante.
  const ehQuedaVolume = !ehZeroItens && media !== null && media >= 3 && inseridas < media * 0.5;
  if (ehQuedaVolume) {
    const novo = quedaAtual + 1;
    await patchFonte(fonte.id, { queda_volume_consecutivo: novo });
    if (novo === LIMITE_FALHAS_PARA_ALERTA) {
      await criarAlerta(fonte, novo, "queda_volume",
        `Inseriu ${inseridas} itens; média histórica da fonte é ${media.toFixed(1)}.`);
    }
  } else if (quedaAtual > 0) {
    await patchFonte(fonte.id, { queda_volume_consecutivo: 0 });
    if (quedaAtual >= LIMITE_FALHAS_PARA_ALERTA) await resolverAlerta(fonte.id, "queda_volume");
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const tokenHeader = req.headers.authorization === `Bearer ${CRON_SECRET}`;
  const tokenQuery  = req.query?.key === CRON_SECRET;
  if (CRON_SECRET && !tokenHeader && !tokenQuery) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  resetStats();
  recuperacoesUsadas = 0;

  try {
    const [fontes, mediaMap] = await Promise.all([
      fetchFontesAtivas(),
      fetchMediaItens(),
    ]);

    let totalInseridas = 0;
    const resultados  = [];
    const registrosSaude = [];

    for (const fonte of fontes) {
      const estrategia = getEstrategia(fonte);

      if (estrategia === "sem_suporte") {
        resultados.push({ fonte: fonte.nome, status: "sem_suporte" });
        registrosSaude.push({
          fonte_id: fonte.id, fonte_nome: fonte.nome,
          status: "sem_suporte", itens_encontrados: 0,
          itens_inseridos: 0, tempo_resposta_ms: 0, falhas_consecutivas: 0,
        });
        continue;
      }

      let xml = null, ms = 0;
      try {
        const resultado = estrategia === "rss_nativo"
          ? await fetchRssNativo(fonte.rss_url)
          : await fetchFeedXml(normalizarUrl(fonte.url));
        xml = resultado.xml;
        ms  = resultado.ms;
      } catch { /* xml permanece null */ }

      if (!xml) {
        await atualizarStatusFalha(fonte, false);
        resultados.push({ fonte: fonte.nome, status: "erro_fetch", estrategia });
        registrosSaude.push({
          fonte_id: fonte.id, fonte_nome: fonte.nome,
          status: "erro_fetch", itens_encontrados: 0,
          itens_inseridos: 0, tempo_resposta_ms: ms, falhas_consecutivas: 1,
        });
        continue;
      }

      await atualizarStatusFalha(fonte, true);

      const items    = parseRssItems(xml);
      const limite   = getLimite(fonte.nome);
      const inseridas = await upsertNoticias(items, fonte, limite);
      totalInseridas += inseridas;

      const media = mediaMap.get(fonte.id) ?? null;
      await atualizarStatusVolume(fonte, items.length, inseridas, media);

      resultados.push({
        fonte: fonte.nome, estrategia,
        grupo: getGrupo(fonte.nome),
        itens: items.length, limite, inseridas,
        tempo_ms: ms,
      });

      registrosSaude.push({
        fonte_id: fonte.id, fonte_nome: fonte.nome,
        status: "ok", itens_encontrados: items.length,
        itens_inseridos: inseridas,
        tempo_resposta_ms: ms, falhas_consecutivas: 0,
      });
    }

    await registrarSaude(registrosSaude);

    return res.status(200).json({
      ok: true,
      totalFontes: fontes.length,
      totalInseridas,
      recuperacaoImagens: getStatsResumo(),
      resultados,
    });
  } catch (err) {
    console.error("Cron error:", err);
    return res.status(500).json({ error: err.message });
  }
}
