# Roadmap — Circular Notícias RJ

> Última atualização: 12/07/2026
> Este documento existe para preservar o raciocínio estratégico do projeto entre sessões de trabalho, já que o desenvolvimento é solo e via editor web do GitHub (mobile).

---

## Visão do projeto

O Circular Notícias RJ não é um agregador de notícias simples — é uma plataforma regional de informação com arquitetura modular, pensada para crescer incorporando novos módulos sem precisar recomeçar do zero. A prioridade editorial é diversidade de fontes, identidade regional do Rio de Janeiro, e curadoria de qualidade acima de volume bruto.

---

## Os 3 estágios

A lógica do roadmap: **cada estágio financia ou fortalece o seguinte.**

### 1. Fundação — ✅ Concluída e validada

- Ingestão de 80+ fontes (hoje 73 ativas, após desativação de 5 fontes quebradas), organizadas em grupos com limites por volume (A: grandes portais, B: regionais, C: oficiais/prefeituras, D: genéricas nacionais)
- RSS nativo + scraping via Manus para fontes sem RSS compatível
- Curadoria editorial (`curarFeedCompleto` em `App.jsx`): diversidade de fontes, cooldown, limite de oficiais/genéricas por página, rotação de prioridade por categoria
- Paginação estável via rota coringa (evita re-fetch a cada troca de página)
- **Recuperação inteligente de imagens em 2 fases:**
  - Fase 1 (`ingest-news.js`): RSS → Open Graph → conteúdo → fallback institucional por categoria
  - Fase 2 (`recover-images.js`, endpoint separado): retenta notícias marcadas como pendentes, com teto de tentativas
  - Ambos os tetos de execução (`MAX_RECUPERACOES_POR_EXECUCAO`, `MAX_TENTATIVAS_RECUPERACAO`) configuráveis por variável de ambiente
- Cron duplo via cron-job.org: ingestão a cada 6h, recuperação de imagens 3x/dia
- Monitoramento básico de saúde das fontes (`fontes_saude`)
- Validada com múltiplos testes reais consecutivos, mostrando taxa de recuperação de imagem estável (~93-97%)

**Marco técnico**: User-Agent de bot genérico causava bloqueio silencioso em vários sites regionais (WAF); corrigido com headers de navegador real. Timeout de RSS nativo aumentado de 10s para 15s.

### 2. Operação — 🔶 Em andamento

**Concluído:**
- Sistema de alerta de fonte com falha consecutiva (`falha_fetch`): dispara após 3 falhas seguidas, registra em `alertas_fontes`, resolve automaticamente quando a fonte volta a funcionar
- **Painel administrativo (`/admin`)**: protegido por login (Supabase Auth), mostra saúde das fontes em tempo real, alertas ativos, sem precisar de SQL manual
- Alertas de qualidade de conteúdo, além de falha de rede:
  - `zero_itens`: feed responde com sucesso mas insere 0 itens novos por 3 execuções seguidas (feed "congelado" — problema real encontrado e corrigido na fonte "O Dia", que ficou 3 semanas travada em conteúdo de 2018 sem ninguém notar)
  - `queda_volume`: volume inserido muito abaixo da média histórica da própria fonte (usa view `fontes_media_itens`)
  - **Status: código no ar, ainda não validado em produção** — precisa de pelo menos 1 dia de execuções reais para confirmar que dispara corretamente

**Ainda não iniciado:**
- Painel de indicadores editoriais: distribuição de notícias por região/categoria, crescimento diário da base, evolução da taxa de recuperação de imagens ao longo do tempo (dados já existem no banco, falta agregação + interface)
- Recuperação automática de fontes com falha (hoje a correção é manual — ex.: caso O Dia foi corrigido por investigação humana)
- Detecção de anomalias mais ampla
- Instrumentação de "qualidade da curadoria": medir violações/relaxamentos das regras de diversidade (cooldown, limite por fonte) no algoritmo `curarFeedCompleto` — único item da Inteligência Editorial que não tem dado nenhum hoje, precisa ser instrumentado do zero

### 3. Sustentação financeira — 🔲 Não iniciada

- Gestão de anúncios / cards patrocinados
- Segmentação por região (já existe a base: campo `regiao` em cada notícia)
- Relatórios de impressões e cliques
- Controle de campanhas por anunciante

---

## As 3 camadas do Centro de Inteligência

O painel administrativo (`/admin`) deve evoluir com uma área separada e distinta do painel operacional de tarefas — o "Centro de Inteligência" propriamente dito, dividido em 3 camadas:

### (A) Inteligência Operacional — em construção
Monitora o **sistema**: saúde das fontes, performance/tempo de resposta, recuperação de imagens, falhas, crescimento da base.
**Dados já existem** (`fontes_saude`, `imagem_origem`, `tempo_resposta_ms`, `falhas_consecutivas_atual`, `zero_itens_consecutivo`, `queda_volume_consecutivo`) — falta interface completa (hoje só saúde básica está visível no `/admin`).

### (B) Inteligência Editorial — não iniciada
Monitora o **conteúdo**: distribuição por região/categoria vs. "esperado", concentração excessiva numa fonte, fontes replicadas, horários de maior volume, municípios com pouca cobertura.
**Requer decisão editorial manual primeiro** — definir o que é "distribuição saudável" antes de instrumentar (não é só uma query, é uma norma que só Agnaldo pode definir).
Objetivo futuro: gerar insights automáticos em texto (ex. "cobertura da Região Serrana caiu 28% em 7 dias"), não só gráficos.

### (C) Inteligência Comercial — não iniciada
Ativa quando houver anunciantes: receita por região, cliques por categoria, desempenho por formato de anúncio/anunciante.

---

## Visão de longo prazo

O projeto acumula naturalmente um **Data Warehouse operacional**: histórico de saúde por fonte, tempo de resposta ao longo do tempo, taxa de recuperação de imagens, evolução diária de notícias, distribuição por região/categoria, frequência de publicação por fonte, fontes que saem e voltam do ar.

Isso representa uma virada de fase do projeto: de **"construir funcionalidades"** para **"construir conhecimento sobre o próprio sistema"** — a diferença entre um software que funciona e uma plataforma que se aperfeiçoa continuamente a partir dos próprios dados.

---

## Princípios de arquitetura (aprendidos na prática)

- **Separação de responsabilidades por tempo de execução**: ingestão (rápida) e recuperação de imagem (lenta, faz fetch de HTML) são endpoints separados — evita estourar timeout da Vercel Hobby.
- **Configuração via variável de ambiente, não hardcoded**: tetos e limites (`MAX_RECUPERACOES_POR_EXECUCAO`, `MAX_TENTATIVAS_RECUPERACAO`) são env vars — permite ajustar sem alterar código, e sem custo ao migrar de plano de hospedagem no futuro.
- **Um "problema" pode ter causas completamente diferentes por fonte** — o mesmo sintoma (`erro_fetch`) já teve como causa real: bloqueio de WAF por User-Agent, erro 500 no servidor de origem, timeout de rede, e feed com encoding quebrado. Cada fonte com falha merece investigação individual antes de aplicar correção genérica.
- **Alertas devem dedupllicar e resolver sozinhos**: o padrão usado (`alertas_fontes` com `resolvido`, `criado_em`, `resolvido_em`) evita spam de notificação repetida e reflete o estado real automaticamente.
- **Testar depois de mudança, sempre com amostra real**: validação por SQL/logs reais, não achismo — vários "parece que funcionou" foram corrigidos ao ver os dados de verdade (ex.: cache do navegador escondendo que uma correção tinha funcionado).
- **Antes de otimizar, validar que já está funcionando**: limites de volume por fonte foram mantidos estáveis mesmo com plano de aumentá-los, porque o sistema estava em fase de validação — mudanças de configuração e código novo não devem ser misturadas no mesmo ciclo sem necessidade.

---

## Decisões de infraestrutura já tomadas

- **Frontend**: React/Vite SPA, deploy Vercel
- **Backend**: Supabase (PostgreSQL) + Vercel serverless functions
- **Autenticação do painel admin**: Supabase Auth (e-mail/senha), rotas `/admin` e `/admin/login`, protegidas via `RequireAuth`
- **Cron**: cron-job.org externo (Vercel Hobby só permite 1x/dia nativo)
- **Scraping de fallback**: serviço Manus para fontes sem RSS compatível (allowlist de domínios em `ALLOWLIST`)
- **Sem serviço de e-mail externo**: alertas ficam só no banco + painel visual, por decisão consciente (volume de fontes não justificava a complexidade de um serviço de e-mail transacional no momento)


  ---

## Princípio de Arquitetura — Instrumentação orientada à descoberta

O objetivo do Centro de Inteligência não é apenas apresentar métricas ou produzir dashboards visualmente agradáveis.

Cada indicador deve aumentar a capacidade de descobrir comportamentos inesperados do sistema, inclusive problemas cuja existência ainda não era conhecida.

O valor de uma métrica deve ser avaliado pela pergunta:

> "Se algo começar a sair do normal, este indicador tornará isso evidente?"

Isso transforma o Centro de Inteligência em uma ferramenta de engenharia operacional, e não apenas em um painel executivo.

Na prática, um bom indicador deve:

- tornar inconsistências perceptíveis;
- facilitar investigações;
- permitir confirmar ou refutar hipóteses;
- reduzir o tempo entre o surgimento de um problema e sua descoberta;
- gerar confiança nos dados utilizados para decisões futuras.

**Casos reais já observados no projeto que comprovam esse princípio:**

- a investigação manual da fonte O Dia revelou um feed congelado há semanas, o que motivou a criação do alerta automático `zero_itens` para detectar esse padrão preventivamente no futuro;
- a métrica de recuperação de imagens revelou a existência de dados históricos sem `imagem_origem`, evitando um falso diagnóstico de falha;
- a distribuição por regiões evidenciou duplicidade na classificação geográfica, permitindo consolidar corretamente as nove regiões oficiais do estado;
- a análise das fontes revelou registros duplicados na tabela `fontes`, classificados como dívida técnica de baixa prioridade.

Esses exemplos demonstram que o maior valor do Centro de Inteligência não está em responder perguntas previamente conhecidas, mas em revelar perguntas que ainda não haviam sido feitas.

### Os três níveis de maturidade

- **Monitoramento**: "Está funcionando?"
- **Observabilidade**: "Por que deixou de funcionar?"
- **Inteligência**: "O que está mudando antes que se torne um problema?"

O Circular Notícias RJ já ultrapassou o nível de monitoramento e está entrando no de observabilidade. Quando o Centro de Inteligência passar a produzir interpretações e tendências automaticamente (ex.: "a cobertura da Região Serrana caiu X% em 7 dias"), o projeto avançará para o nível de inteligência.

**Aplicação prática**: ao avaliar um novo indicador para o painel, a pergunta certa não é "que gráfico podemos mostrar?", e sim "que tipo de problema esse indicador vai nos permitir descobrir?".
