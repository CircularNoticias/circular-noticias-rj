// api/cron/ingest-news.js
//
// Roda 1x/dia (configurado em vercel.json).
// Fluxo: busca TODAS as fontes ativas -> decide estratégia por fonte
// (rss_nativo / scraping_manus / sem_suporte) -> parseia o XML RSS ->
// LIMPA o HTML do resumo -> EXTRAI imagem (enclosure/media/thumbnail/<img>)
// -> CLASSIFICA categoria por palavra-chave -> DETECTA cidade/região pelo
// texto da notícia -> insere em `noticias` no Supabase (ignorando
// duplicados por url_original).

import { XMLParser } from "fast-xml-parser";

const NOTICIAS_TABLE = "noticias";
const FONTES_TABLE = "fontes";

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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FEED_API_KEY = process.env.FEED_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const FEED_GENERATOR_BASE_URL = "https://rssgenfix-7qjtnnnf.manus.space";

// ---------- Utilitários de texto ----------

function removerAcentos(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function limparHtml(raw) {
  if (!raw) return "";
  let text = String(raw);
  text = text.replace(/<[^>]*>/g, " "); // remove tags
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const ENTIDADES = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  };
  text = text.replace(/&([a-zA-Z]+);/g, (m, name) => ENTIDADES[name] ?? m);
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

// ---------- Extração de imagem ----------

function extrairImagem(item) {
  if (item.enclosure) {
    const enc = Array.isArray(item.enclosure) ? item.enclosure[0] : item.enclosure;
    if (enc?.["@_url"]) return enc["@_url"];
  }
  const media = item["media:content"];
  if (media) {
    const m = Array.isArray(media) ? media[0] : media;
    if (m?.["@_url"]) return m["@_url"];
  }
  const thumb = item["media:thumbnail"];
  if (thumb) {
    const t = Array.isArray(thumb) ? thumb[0] : thumb;
    if (t?.["@_url"]) return t["@_url"];
  }
  const html = item["content:encoded"] || item.description || "";
  const match = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];
  return null;
}

// ---------- Classificação de categoria por palavra-chave ----------

const CATEGORIA_PALAVRAS = {
  "Política": ["prefeito", "prefeitura", "vereador", "camara municipal", "camara dos vereadores", "governador", "alerj", "eleicao", "eleitoral", "candidato", "deputado", "senador", "ministro", "presidente", "partido", "stf", "congresso", "secretario", "secretaria municipal", "projeto de lei", "plenario", "sancionar", "veto"],
  "Economia": ["economia", "emprego", "desemprego", "investimento", "empresa", "inflacao", "comercio", "industria", "pib", "mercado", "negocio", "financeiro", "imposto", "varejo", "exportacao", "importacao", "salario", "juros", "selic", "bolsa de valores", "acoes"],
  "Segurança": ["policia", "policial", "crime", "roubo", "furto", "homicidio", "prisao", "trafico", "violencia", "operacao policial", "delegacia", "assalto", "morto a tiros", "morta a tiros", "baleado", "baleada", "assassinado", "assassinada", "assassinato", "mataram", "execucao", "tiroteio", "vitima fatal", "encontrado morto", "encontrada morta", "facada", "esfaqueado", "esfaqueada", "sequestro", "extorsao", "milicia", "apreensao de drogas", "arma de fogo", "foragido", "suspeito de"],
  "Saúde": ["saude", "hospital", "upa", "posto de saude", "vacina", "medico", "sus", "doenca", "covid", "dengue", "clinica", "atendimento medico", "emergencia", "ambulancia", "internado", "internada", "leito", "cirurgia", "epidemia", "surto"],
  "Educação": ["escola", "educacao", "aluno", "professor", "universidade", "ensino", "matricula", "colegio", "creche", "vestibular", "enem", "merenda escolar", "ensino fundamental", "ensino medio"],
  "Turismo": ["turismo", "turista", "turistas", "praia", "hotel", "pousada", "viagem", "feriado", "temporada", "ponto turistico", "visitantes"],
  "Meio Ambiente": ["meio ambiente", "sustentabilidade", "reciclagem", "poluicao", "preservacao", "ambiental", "desmatamento", "queimada", "incendio florestal", "area de preservacao", "saneamento", "residuos solidos", "mudanca climatica"],
  "Tecnologia": ["tecnologia", "startup", "internet", "aplicativo", "digital", "inovacao", "inteligencia artificial", "software", "ciberseguranca", "plataforma digital"],
  "Cultura": ["cultura", "show", "festival", "teatro", "musica", "cinema", "exposicao", "artista", "carnaval", "patrimonio historico", "museu", "biblioteca", "literatura"],
  "Esportes": ["futebol", "esporte", "campeonato", "jogo", "time", "atleta", "copa", "olimpiada", "gol", "vitoria", "derrota", "placar", "selecao", "torcida", "estadio", "maratona"],
};
function classificarCategoria(titulo, resumo) {
  const texto = removerAcentos(`${titulo} ${resumo}`.toLowerCase());
  for (const [categoria, palavras] of Object.entries(CATEGORIA_PALAVRAS)) {
    if (palavras.some((p) => texto.includes(p))) return categoria;
  }
  return "Geral";
}

// ---------- Detecção de cidade/região pelo texto da notícia ----------
// Os ids de região batem com os usados no front-end (REGIONS), para
// permitir comparação direta sem precisar de normalização lá.

const CIDADES_REGIAO = [
  ["rio de janeiro", "Rio de Janeiro", "metropolitana"],
  ["niteroi", "Niterói", "metropolitana"],
  ["nova iguacu", "Nova Iguaçu", "metropolitana"],
  ["duque de caxias", "Duque de Caxias", "metropolitana"],
  ["sao goncalo", "São Gonçalo", "metropolitana"],
  ["belford roxo", "Belford Roxo", "metropolitana"],
  ["nilopolis", "Nilópolis", "metropolitana"],
  ["mesquita", "Mesquita", "metropolitana"],
  ["itaborai", "Itaboraí", "metropolitana"],
  ["mage", "Magé", "metropolitana"],
  ["marica", "Maricá", "metropolitana"],
  ["queimados", "Queimados", "metropolitana"],
  ["japeri", "Japeri", "metropolitana"],
  ["seropedica", "Seropédica", "metropolitana"],
  ["itaguai", "Itaguaí", "metropolitana"],
  ["guapimirim", "Guapimirim", "metropolitana"],
  ["rio bonito", "Rio Bonito", "metropolitana"],
  ["cabo frio", "Cabo Frio", "lagos"],
  ["arraial do cabo", "Arraial do Cabo", "lagos"],
  ["buzios", "Búzios", "lagos"],
  ["armacao dos buzios", "Armação dos Búzios", "lagos"],
  ["sao pedro da aldeia", "São Pedro da Aldeia", "lagos"],
  ["araruama", "Araruama", "lagos"],
  ["iguaba grande", "Iguaba Grande", "lagos"],
  ["saquarema", "Saquarema", "lagos"],
  ["petropolis", "Petrópolis", "serrana"],
  ["teresopolis", "Teresópolis", "serrana"],
  ["nova friburgo", "Nova Friburgo", "serrana"],
  ["cachoeiras de macacu", "Cachoeiras de Macacu", "serrana"],
  ["sumidouro", "Sumidouro", "serrana"],
  ["carmo", "Carmo", "serrana"],
  ["duas barras", "Duas Barras", "serrana"],
  ["cordeiro", "Cordeiro", "serrana"],
  ["santa maria madalena", "Santa Maria Madalena", "serrana"],
  ["bom jardim", "Bom Jardim", "serrana"],
  ["campos dos goytacazes", "Campos dos Goytacazes", "norte"],
  ["macae", "Macaé", "norte"],
  ["sao joao da barra", "São João da Barra", "norte"],
  ["quissama", "Quissamã", "norte"],
  ["carapebus", "Carapebus", "norte"],
  ["cardoso moreira", "Cardoso Moreira", "norte"],
  ["sao fidelis", "São Fidélis", "norte"],
  ["conceicao de macabu", "Conceição de Macabu", "norte"],
  ["itaperuna", "Itaperuna", "noroeste"],
  ["santo antonio de padua", "Santo Antônio de Pádua", "noroeste"],
  ["miracema", "Miracema", "noroeste"],
  ["italva", "Italva", "noroeste"],
  ["natividade", "Natividade", "noroeste"],
  ["bom jesus do itabapoana", "Bom Jesus do Itabapoana", "noroeste"],
  ["porciuncula", "Porciúncula", "noroeste"],
  ["angra dos reis", "Angra dos Reis", "costa-verde"],
  ["paraty", "Paraty", "costa-verde"],
  ["mangaratiba", "Mangaratiba", "costa-verde"],
  ["volta redonda", "Volta Redonda", "medio-paraiba"],
  ["barra mansa", "Barra Mansa", "medio-paraiba"],
  ["resende", "Resende", "medio-paraiba"],
  ["barra do pirai", "Barra do Piraí", "medio-paraiba"],
  ["pinheiral", "Pinheiral", "medio-paraiba"],
  ["porto real", "Porto Real", "medio-paraiba"],
  ["quatis", "Quatis", "medio-paraiba"],
  ["itatiaia", "Itatiaia", "medio-paraiba"],
  ["vassouras", "Vassouras", "centro-sul"],
  ["valenca", "Valença", "centro-sul"],
  ["paty do alferes", "Paty do Alferes", "centro-sul"],
  ["mendes", "Mendes", "centro-sul"],
  ["miguel pereira", "Miguel Pereira", "centro-sul"],
];

function detectarCidadeRegiao(titulo, resumo) {
  const texto = removerAcentos(`${titulo} ${resumo}`.toLowerCase());
  for (const [match, nome, regiao] of CIDADES_REGIAO) {
    if (texto.includes(match)) {
      return { cidade: nome, regiao };
    }
  }
  return null;
}

function regiaoFallback(regiaoFonte) {
  if (!regiaoFonte) return "metropolitana";
  const r = removerAcentos(regiaoFonte.toLowerCase());
  if (r.includes("lagos")) return "lagos";
  if (r.includes("serrana")) return "serrana";
  if (r.includes("noroeste")) return "noroeste";
  if (r.includes("norte")) return "norte";
  if (r.includes("costa verde") || r.includes("sul")) return "costa-verde";
  if (r.includes("paraiba")) return "medio-paraiba";
  if (r.includes("centro-sul") || r.includes("centro sul")) return "centro-sul";
  return "metropolitana";
}

// ---------- Fontes ----------

async function fetchFontesAtivas() {
  const url = `${SUPABASE_URL}/rest/v1/${FONTES_TABLE}?select=id,nome,url,rss_url,regiao,ativo&ativo=eq.true`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Falha ao buscar fontes: ${res.status}`);
  return res.json();
}

function normalizarUrl(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getEstrategia(fonte) {
  if (fonte.rss_url) return "rss_nativo";
  if (!fonte.url) return "sem_suporte";
  let dominio;
  try {
    dominio = new URL(normalizarUrl(fonte.url)).hostname;
  } catch {
    return "sem_suporte";
  }
  if (ALLOWLIST_DOMAINS.some((d) => dominio.includes(d))) return "scraping_manus";
  return "sem_suporte";
}

async function fetchRssNativo(rssUrl) {
  const res = await fetch(rssUrl);
  if (!res.ok) {
    console.error(`Erro ao buscar RSS nativo de ${rssUrl}: ${res.status}`);
    return null;
  }
  return res.text();
}

async function fetchFeedXml(sourceUrl) {
  const feedUrl = `${FEED_GENERATOR_BASE_URL}/api/feed?url=${encodeURIComponent(sourceUrl)}&key=${FEED_API_KEY}`;
  const res = await fetch(feedUrl);
  if (!res.ok) {
    console.error(`Erro ao buscar feed de ${sourceUrl}: ${res.status} ${await res.text().catch(() => "")}`);
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

// ---------- Inserção no Supabase ----------

async function upsertNoticias(items, fonte) {
  if (!items.length) return 0;

  const rows = items.map((item) => {
    const tituloLimpo = limparHtml(item.title || "");
    const resumoLimpo = limparHtml(item.description || "");
    const deteccao = detectarCidadeRegiao(tituloLimpo, resumoLimpo);
    const regiao = deteccao ? deteccao.regiao : regiaoFallback(fonte.regiao);
    const cidade = deteccao ? deteccao.cidade : null;
    const categoria = classificarCategoria(tituloLimpo, resumoLimpo);
    const imagemUrl = extrairImagem(item);

    return {
      titulo: tituloLimpo,
      resumo: resumoLimpo,
      url_original: item.link || "",
      fonte_id: fonte.id,
      fonte_nome: fonte.nome,
      regiao,
      cidade,
      categoria,
      imagem_url: imagemUrl,
      data_publicacao: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      processado_ia: false,
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
    const errText = await res.text();
    console.error(`Erro ao inserir notícias de ${fonte.nome}: ${res.status} ${errText}`);
    return 0;
  }
  return rows.length;
}

// ---------- Handler principal ----------

export default async function handler(req, res) {
  const tokenHeader = req.headers.authorization === `Bearer ${CRON_SECRET}`;
  const tokenQuery = req.query?.key === CRON_SECRET;
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

      const xml =
        estrategia === "rss_nativo"
          ? await fetchRssNativo(fonte.rss_url)
          : await fetchFeedXml(normalizarUrl(fonte.url));

      if (!xml) {
        resultados.push({ fonte: fonte.nome, status: "erro_fetch", estrategia });
        continue;
      }
      const items = parseRssItems(xml);
      const inseridas = await upsertNoticias(items, fonte);
      totalInseridas += inseridas;
      resultados.push({ fonte: fonte.nome, estrategia, itens: items.length, inseridas });
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
               
