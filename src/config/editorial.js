// src/config/editorial.js
//
// Configuração editorial centralizada do Circular Notícias RJ.
// Edite este arquivo para ajustar limites, grupos de fontes e pesos
// sem precisar alterar a lógica principal do sistema.

// ─── Grupos de fontes e limites na ingestão ────────────────────────────────
// O limite define quantas notícias são importadas por execução do cron.
// Adicione ou remova fontes aqui conforme o portal cresce.

export const GRUPOS_FONTES = {
  A: {
    nome: "Grandes Portais",
    limite: 10,
    fontes: [
      "O Globo", "Extra", "O Dia", "G1 Rio de Janeiro",
      "G1 Região dos Lagos", "G1 Norte Fluminense",
      "G1 Região Serrana", "G1 Sul do Rio e Costa Verde",
      "R7 Rio de Janeiro", "Diário do Rio",
    ],
  },
  B: {
    nome: "Portais Regionais",
    limite: 10,
    fontes: [
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
    ],
  },
  C: {
    nome: "Fontes Oficiais",
    limite: 5,
    fontes: [
      "Prefeitura do Rio", "Prefeitura de Niterói",
      "Prefeitura de Cabo Frio", "Prefeitura de Volta Redonda",
      "Prefeitura de Casimiro de Abreu", "Prefeitura de Macaé",
    ],
  },
};

// Limite padrão para fontes não classificadas em nenhum grupo
export const LIMITE_PADRAO = 10;

// ─── Configuração da Home ──────────────────────────────────────────────────

export const HOME_CONFIG = {
  // Total de cards na vitrine
  totalCards: 32,
  // Máximo de notícias por fonte na Home (1 = diversidade máxima)
  maxPorFonte: 1,
  // Máximo de notícias de fontes oficiais (prefeituras) na Home
  maxOficiais: 4,
  // Peso por região — regiões com mais fontes recebem mais espaço proporcional
  // (usado para equilibrar regiões menores com as maiores)
  pesoRegiao: {
    metropolitana: 1.0,
    baixada: 1.0,
    lagos: 0.8,
    serrana: 0.8,
    norte: 0.8,
    noroeste: 0.6,
    "costa-verde": 0.6,
    "medio-paraiba": 0.6,
    "centro-sul": 0.6,
  },
};

