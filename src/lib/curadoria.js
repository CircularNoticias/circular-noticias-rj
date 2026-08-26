// src/lib/curadoria.js
//
// Módulo compartilhado de curadoria editorial.
// Usado tanto pelo frontend (App.jsx, na Home) quanto por rotinas de
// auditoria no servidor — garantindo que a lógica seja idêntica nos dois
// lugares, sem risco de divergência entre o que o leitor vê e o que é medido.

// Fontes Oficiais — limitadas na Home
export const FONTES_OFICIAIS = new Set([
  "Prefeitura do Rio","Prefeitura de Niterói","Prefeitura de Cabo Frio",
  "Prefeitura de Volta Redonda","Prefeitura de Casimiro de Abreu","Prefeitura de Macaé",
  "Prefeitura de Japeri","Prefeitura de Mangaratiba","Prefeitura de Maricá",
  "Prefeitura de Cabo Frio (Oficial)",
  "Prefeitura de Nilópolis","Prefeitura de Paracambi","Prefeitura de Porciúncula",
  "Prefeitura de Quatis","Prefeitura de Queimados","Prefeitura de Quissamã",
  "Prefeitura de Rio Bonito","Centro de Operações Rio",
]);

// ─── Fontes genéricas (conteúdo nacional, sem recorte do Estado do RJ) ─────
// Entram só como tempero ocasional — nunca competem de igual com o
// jornalismo regional. Ver curarFeedCompleto: maxGenericasPorPagina.
export const FONTES_GENERICAS = new Set([
  "Tua Saúde","Guia do Estudante (Abril)","Fuxico TV","Caras",
  "Revista PEGN (Globo)","Saúde Abril","Casa da Ciência","InfoMoney",
]);

// ─── Ordem de prioridade das categorias (rotaciona a cada sessão) ───────────
// O leitor NÃO vê essas categorias — são só para organização interna.
export const PRIORIDADE_BASE = [
  "Segurança","Política","Saúde","Economia",
  "Educação","Turismo","Cultura","Esportes",
  "Meio Ambiente","Tecnologia","Geral",
];

// Rotaciona o array por N posições
export function rotacionar(arr, n) {
  const pos = n % arr.length;
  return [...arr.slice(pos), ...arr.slice(0, pos)];
}

// A cada hora do dia, uma prioridade diferente está em primeiro
export function getPrioridadeAtual() {
  const hora = new Date().getHours();
  return rotacionar(PRIORIDADE_BASE, hora % PRIORIDADE_BASE.length);
}

// ─── Algoritmo editorial ────────────────────────────────────────────────────
// Organiza o pool por categoria (prioridade rotativa) e dentro de cada
// categoria garante diversidade de fontes (1 por fonte).
// O leitor vê um fluxo contínuo — sem títulos nem rótulos de categoria.
//
// maxTotalPorFonte: cota MÁXIMA que uma mesma fonte pode ocupar no feed
// curado INTEIRO (não só dentro de um bloco de itemsPerPage). Diferente das
// outras regras, essa nunca é relaxada pela cascata — é o teto que garante
// diversidade de verdade quando o pool tem fontes muito desiguais em volume
// (poucos portais grandes publicando muito mais que as fontes regionais no
// mesmo intervalo de tempo). Sem esse teto, assim que as fontes pequenas
// esgotam seu estoque de itens recentes, só sobram os portais grandes pra
// preencher o resto do feed — daí a predominância que aparecia do meio pro
// final. O excedente que não entra nessa leva não é descartado do banco,
// só fica de fora desta seleção — reaparece naturalmente na próxima
// atualização, quando a janela de itens recentes se renovar.
export function curarFeedCompleto(pool, itemsPerPage = 32, maxOficiais = 4, maxPorFontePorPagina = 4, maxGenericasPorPagina = 1, maxTotalPorFonte = 10) {
  const prioridade = getPrioridadeAtual();

  // 1) Agrupar por categoria, mantendo a ordem cronológica dentro do grupo
  const grupos = {};
  for (const cat of prioridade) grupos[cat] = [];
  if (!grupos["Geral"]) grupos["Geral"] = [];
  for (const n of pool) {
    const cat = n.category in grupos ? n.category : "Geral";
    grupos[cat].push(n);
  }

  // 2) Intercalar categorias em round-robin (prioridade), sem descartar nada
  const filas = prioridade.map(cat => [...(grupos[cat] || [])]);
  const intercalado = [];
  let restante = filas.reduce((soma, f) => soma + f.length, 0);
  let idx = 0;
  while (restante > 0) {
    const fila = filas[idx % filas.length];
    if (fila.length > 0) {
      intercalado.push(fila.shift());
      restante--;
    }
    idx++;
  }

  // 3) Seleção final, item por item, respeitando QUATRO regras ao mesmo tempo:
  //    - cota total por fonte no feed inteiro (regra rígida — ver comentário
  //      acima; verificada ANTES de qualquer outra e nunca relaxada);
  //    - cooldown por fonte (nunca a mesma fonte antes de MIN_GAP posições);
  //    - limite de oficiais por bloco de página (nunca mais que maxOficiais
  //      oficiais dentro de um mesmo bloco de itemsPerPage);
  //    - limite de aparições por fonte por bloco de página (nunca mais que
  //      maxPorFontePorPagina da MESMA fonte dentro de um mesmo bloco — o
  //      excedente é adiado pra um bloco/página seguinte).
  // Tudo numa única passada — nenhum item é movido depois de posicionado,
  // então uma regra nunca desfaz o trabalho da outra.
  const MIN_GAP = 3;

  const porFonte = new Map();
  for (const n of intercalado) {
    if (!porFonte.has(n.source)) porFonte.set(n.source, []);
    porFonte.get(n.source).push(n);
  }
  const fontes = [...porFonte.keys()];

  const resultado = [];
  const liberaEm = new Map();
  const contagemTotal = new Map();
  let posicao = 0;
  let ponteiro = 0; // avança em rodízio — dá a MESMA prioridade pra fonte
                    // grande e pequena, em vez de sempre preferir quem tem
                    // mais itens (o que empurrava prefeituras e fontes
                    // pequenas pra páginas muito distantes).

  const escolherFonte = ({ respeitarOficiais, respeitarCooldown, respeitarMaxPorFonte, respeitarGenericas }) => {
    const inicioBloco = Math.floor(posicao / itemsPerPage) * itemsPerPage;
    const itensDoBloco = resultado.slice(inicioBloco, posicao);
    const oficiaisNoBloco = respeitarOficiais
      ? itensDoBloco.filter(n => n.isOficial).length
      : -Infinity;
    const genericasNoBloco = respeitarGenericas
      ? itensDoBloco.filter(n => n.isGenerica).length
      : -Infinity;

    for (let tentativa = 0; tentativa < fontes.length; tentativa++) {
      const i = (ponteiro + tentativa) % fontes.length;
      const fonte = fontes[i];
      const fila = porFonte.get(fonte);
      if (fila.length === 0) continue;
      // Cota total — regra rígida, checada antes de tudo, nunca relaxada.
      if ((contagemTotal.get(fonte) ?? 0) >= maxTotalPorFonte) continue;
      if (respeitarCooldown && (liberaEm.get(fonte) ?? 0) > posicao) continue;
      if (respeitarOficiais && fila[0].isOficial && oficiaisNoBloco >= maxOficiais) continue;
      if (respeitarGenericas && fila[0].isGenerica && genericasNoBloco >= maxGenericasPorPagina) continue;
      if (respeitarMaxPorFonte) {
        const jaNoBloco = itensDoBloco.filter(n => n.source === fonte).length;
        if (jaNoBloco >= maxPorFontePorPagina) continue;
      }
      ponteiro = (i + 1) % fontes.length; // próxima busca já começa depois desta
      return fonte;
    }
    return null;
  };

  while (true) {
    // Tenta respeitando todas as regras; se não achar candidato, relaxa em
    // cascata, pra nunca travar. O limite de genéricas é o ÚLTIMO a ser
    // relaxado — só permite genérica se literalmente não sobrar mais
    // nenhuma fonte regional disponível. A cota total por fonte NUNCA é
    // relaxada — está embutida em escolherFonte antes de qualquer flag.
    let fonte = escolherFonte({ respeitarOficiais: true, respeitarCooldown: true, respeitarMaxPorFonte: true, respeitarGenericas: true });
    if (fonte === null) fonte = escolherFonte({ respeitarOficiais: true, respeitarCooldown: true, respeitarMaxPorFonte: false, respeitarGenericas: true });
    if (fonte === null) fonte = escolherFonte({ respeitarOficiais: false, respeitarCooldown: true, respeitarMaxPorFonte: false, respeitarGenericas: true });
    if (fonte === null) fonte = escolherFonte({ respeitarOficiais: false, respeitarCooldown: false, respeitarMaxPorFonte: false, respeitarGenericas: true });
    if (fonte === null) fonte = escolherFonte({ respeitarOficiais: false, respeitarCooldown: false, respeitarMaxPorFonte: false, respeitarGenericas: false });

    // Nenhuma fonte disponível — ou todas esgotaram o estoque, ou todas
    // bateram na cota total. O que sobrar no pool fica de fora desta
    // seleção (não é descartado do banco, só não entra nesta leva).
    if (fonte === null) break;

    const item = porFonte.get(fonte).shift();
    resultado.push(item);
    contagemTotal.set(fonte, (contagemTotal.get(fonte) ?? 0) + 1);
    liberaEm.set(fonte, posicao + MIN_GAP);
    posicao++;
  }

  return resultado;
}
    
