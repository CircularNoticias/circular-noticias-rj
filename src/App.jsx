import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

// ─── Regiões (inclui Baixada Fluminense como região própria) ───────────────
const REGIONS = [
  { id: "todos",         label: "Todo o Estado" },
  { id: "metropolitana", label: "Região Metropolitana" },
  { id: "baixada",       label: "Baixada Fluminense" },
  { id: "lagos",         label: "Região dos Lagos" },
  { id: "serrana",       label: "Região Serrana" },
  { id: "norte",         label: "Norte Fluminense" },
  { id: "noroeste",      label: "Noroeste Fluminense" },
  { id: "costa-verde",   label: "Costa Verde" },
  { id: "medio-paraiba", label: "Médio Paraíba" },
  { id: "centro-sul",    label: "Centro-Sul Fluminense" },
];

const CATEGORIES = [
  "Todos","Política","Segurança","Economia","Turismo","Saúde",
  "Educação","Tecnologia","Meio Ambiente","Cultura","Esportes",
];

const LAGOS_CITIES = [
  "Cabo Frio","Arraial do Cabo","Armação dos Búzios",
  "São Pedro da Aldeia","Araruama","Saquarema","Iguaba Grande","Casimiro de Abreu",
];

const BAIXADA_CITIES = [
  "Nova Iguaçu","Duque de Caxias","Belford Roxo","Nilópolis",
  "Mesquita","Queimados","São João de Meriti","Japeri","Seropédica","Itaguaí",
];

const VALID_REGION_IDS = REGIONS.map(r => r.id).filter(id => id !== "todos");

// Fontes Oficiais (prefeituras) — limitadas na Home
const FONTES_OFICIAIS = new Set([
  "Prefeitura do Rio","Prefeitura de Niterói","Prefeitura de Cabo Frio",
  "Prefeitura de Volta Redonda","Prefeitura de Casimiro de Abreu","Prefeitura de Macaé",
]);

// ─── Cores e identidade visual ─────────────────────────────────────────────
const categoryColors = {
  "Turismo":"#0ea5e9","Meio Ambiente":"#22c55e","Saúde":"#f43f5e",
  "Segurança":"#f97316","Política":"#8b5cf6","Economia":"#eab308",
  "Educação":"#06b6d4","Tecnologia":"#6366f1","Cultura":"#ec4899",
  "Esportes":"#10b981","Geral":"#64748b",
};

const categoryGradients = {
  "Segurança":    "linear-gradient(135deg,#7c2d12,#ea580c)",
  "Política":     "linear-gradient(135deg,#3b0764,#7c3aed)",
  "Saúde":        "linear-gradient(135deg,#881337,#f43f5e)",
  "Esportes":     "linear-gradient(135deg,#064e3b,#10b981)",
  "Economia":     "linear-gradient(135deg,#713f12,#eab308)",
  "Educação":     "linear-gradient(135deg,#0c4a6e,#06b6d4)",
  "Cultura":      "linear-gradient(135deg,#831843,#ec4899)",
  "Turismo":      "linear-gradient(135deg,#0c4a6e,#0ea5e9)",
  "Meio Ambiente":"linear-gradient(135deg,#14532d,#22c55e)",
  "Tecnologia":   "linear-gradient(135deg,#1e1b4b,#6366f1)",
  "Geral":        "linear-gradient(135deg,#0f172a,#1e3a5f)",
};

const categoryIcons = {
  "Segurança":"🚔","Política":"🏛️","Saúde":"🏥","Esportes":"⚽",
  "Economia":"💰","Educação":"📚","Cultura":"🎭","Turismo":"🏖️",
  "Meio Ambiente":"🌿","Tecnologia":"💻","Geral":"📰",
};

// ─── Mapeamento cidade → região (fallback para registros antigos) ───────────
const CITY_TO_REGION = {
  // Metropolitana
  "Rio de Janeiro":"metropolitana","Niterói":"metropolitana",
  "São Gonçalo":"metropolitana","Itaboraí":"metropolitana",
  "Maricá":"metropolitana","Magé":"metropolitana",
  "Guapimirim":"metropolitana","Rio Bonito":"metropolitana",
  // Baixada Fluminense
  "Nova Iguaçu":"baixada","Duque de Caxias":"baixada",
  "Belford Roxo":"baixada","Nilópolis":"baixada",
  "Mesquita":"baixada","Queimados":"baixada",
  "São João de Meriti":"baixada","Japeri":"baixada",
  "Seropédica":"baixada","Itaguaí":"baixada","Paracambi":"baixada",
  // Lagos
  "Cabo Frio":"lagos","Arraial do Cabo":"lagos","Armação dos Búzios":"lagos",
  "Búzios":"lagos","São Pedro da Aldeia":"lagos","Araruama":"lagos",
  "Saquarema":"lagos","Iguaba Grande":"lagos","Casimiro de Abreu":"lagos",
  // Serrana
  "Petrópolis":"serrana","Teresópolis":"serrana","Nova Friburgo":"serrana",
  "Cachoeiras de Macacu":"serrana","Cordeiro":"serrana","Bom Jardim":"serrana",
  // Norte
  "Campos dos Goytacazes":"norte","Macaé":"norte",
  "São João da Barra":"norte","Quissamã":"norte","Carapebus":"norte",
  // Noroeste
  "Itaperuna":"noroeste","Santo Antônio de Pádua":"noroeste",
  "Miracema":"noroeste","Natividade":"noroeste",
  // Costa Verde
  "Angra dos Reis":"costa-verde","Paraty":"costa-verde","Mangaratiba":"costa-verde",
  // Médio Paraíba
  "Volta Redonda":"medio-paraiba","Barra Mansa":"medio-paraiba",
  "Resende":"medio-paraiba","Barra do Piraí":"medio-paraiba","Itatiaia":"medio-paraiba",
  // Centro-Sul
  "Vassouras":"centro-sul","Valença":"centro-sul","Miguel Pereira":"centro-sul",
};

function normalizeRegiao(r) {
  if (!r) return null;
  if (VALID_REGION_IDS.includes(r)) return r;
  const s = r.toLowerCase();
  if (s.includes("baixada"))                            return "baixada";
  if (s.includes("lagos"))                              return "lagos";
  if (s.includes("serrana"))                            return "serrana";
  if (s.includes("noroeste"))                           return "noroeste";
  if (s.includes("norte"))                              return "norte";
  if (s.includes("costa verde") || s.includes("costa-verde")) return "costa-verde";
  if (s.includes("paraíba") || s.includes("paraiba"))   return "medio-paraiba";
  if (s.includes("centro-sul") || s.includes("centro sul")) return "centro-sul";
  if (s.includes("metropolitana") || s.includes("estado")) return "metropolitana";
  return null;
}

function resolveRegion(row) {
  return normalizeRegiao(row.regiao) || CITY_TO_REGION[row.cidade] || "metropolitana";
}

function stripHtml(raw) {
  if (!raw) return "";
  let t = String(raw).replace(/<[^>]*>/g, " ");
  t = t.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)));
  const E = { amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",hellip:"…" };
  t = t.replace(/&([a-zA-Z]+);/g, (m, n) => E[n] ?? m);
  return t.replace(/\s+/g, " ").trim();
}

function formatDateTime(iso) {
  if (!iso) return { date:"", time:"" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" }),
    time: d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }),
  };
}

function mapRow(row) {
  const { date, time } = formatDateTime(row.created_at);
  return {
    id:        row.id,
    region:    resolveRegion(row),
    city:      row.cidade || "",
    category:  row.categoria || "Geral",
    headline:  stripHtml(row.titulo),
    summary:   stripHtml(row.resumo),
    source:    row.fonte_nome || "",
    sourceUrl: row.url_original || "",
    image:     row.imagem_url || null,
    isOficial: FONTES_OFICIAIS.has(row.fonte_nome),
    date, time,
  };
}

// ─── Algoritmo editorial da Home ───────────────────────────────────────────
// Regras: 1 notícia por fonte, máx 4 oficiais, ~32 cards,
//         variedade de regiões e categorias.
function selecionarHome(pool, maxCards = 32, maxOficiais = 4) {
  // Embaralhamento leve para variar a cada refresh (mantendo recência dominante)
  const shuffled = [...pool].sort((a, b) => {
    // 70% peso por data, 30% aleatório — boa mistura de recente + diverso
    const dataDiff = new Date(b.date) - new Date(a.date);
    return dataDiff * 0.7 + (Math.random() - 0.5) * 0.3 * 1e10;
  });

  const fontesSelecionadas = new Set();
  const categoriaCount    = {};
  let   oficiaisCount     = 0;
  const resultado         = [];

  for (const n of shuffled) {
    if (resultado.length >= maxCards) break;
    if (fontesSelecionadas.has(n.source)) continue;
    if (n.isOficial && oficiaisCount >= maxOficiais) continue;
    // Limitar categoria dominante (máx 6 por categoria)
    const cat = n.category;
    if ((categoriaCount[cat] || 0) >= 6) continue;

    fontesSelecionadas.add(n.source);
    categoriaCount[cat] = (categoriaCount[cat] || 0) + 1;
    if (n.isOficial) oficiaisCount++;
    resultado.push(n);
  }
  return resultado;
}

// ─── Componentes visuais ───────────────────────────────────────────────────
function Logo({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8"/>
          <stop offset="100%" stopColor="#1d4ed8"/>
        </linearGradient>
      </defs>
      <path d="M18 72 Q10 50 18 28" stroke="url(#lg)" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <path d="M28 65 Q22 50 28 35" stroke="url(#lg)" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.8"/>
      <path d="M82 28 Q90 50 82 72" stroke="url(#lg)" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <path d="M72 35 Q78 50 72 65" stroke="url(#lg)" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.8"/>
      <circle cx="50" cy="50" r="10" fill="url(#lg)"/>
      <circle cx="50" cy="50" r="5" fill="#fff"/>
      <line x1="37" y1="50" x2="63" y2="50" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" opacity="0.3"/>
    </svg>
  );
}

function NewsCard({ news }) {
  const color   = categoryColors[news.category] || "#64748b";
  const bgImg   = categoryGradients[news.category] || categoryGradients["Geral"];
  const icon    = categoryIcons[news.category] || "📰";
  const [imgErr, setImgErr] = useState(false);
  const showImg = news.image && !imgErr;

  const open = () => news.sourceUrl && window.open(news.sourceUrl, "_blank", "noopener,noreferrer");

  return (
    <div onClick={open} role="link" tabIndex={0}
      onKeyDown={e => e.key === "Enter" && open()}
      style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", overflow:"hidden", cursor:"pointer", transition:"transform 0.15s,box-shadow 0.15s", display:"flex", flexDirection:"column", border:"1px solid #f1f5f9" }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.07)"; }}>
      <div style={{ width:"100%", height:140, position:"relative", background: showImg ? "#e2e8f0" : bgImg, flexShrink:0 }}>
        {showImg
          ? <img src={news.image} alt={news.headline} onError={() => setImgErr(true)} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:6 }}>
              <span style={{ fontSize:32 }}>{icon}</span>
              <span style={{ color:"rgba(255,255,255,0.7)", fontSize:10, fontWeight:700, letterSpacing:1 }}>{news.category.toUpperCase()}</span>
            </div>
        }
        <div style={{ position:"absolute", bottom:0, left:0, height:4, width:"100%", background:color }}/>
        {news.isOficial && (
          <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:8, letterSpacing:0.5 }}>
            OFICIAL
          </div>
        )}
      </div>
      <div style={{ padding:"14px 16px 16px", flex:1, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={{ background:color+"18", color, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>{news.category}</span>
          {news.city && <span style={{ marginLeft:"auto", fontSize:11, color:"#94a3b8" }}>📍 {news.city}</span>}
        </div>
        <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#1e293b", lineHeight:1.4 }}>{news.headline}</h3>
        <div style={{ display:"flex", alignItems:"flex-start", gap:6, background:"#f8fafc", borderRadius:8, padding:"8px 10px" }}>
          <span style={{ color:"#6366f1", marginTop:1, fontSize:12 }}>✦</span>
          <p style={{ margin:0, fontSize:12, color:"#475569", lineHeight:1.55, flex:1 }}>
            {(news.summary || "").slice(0, 120)}{(news.summary || "").length > 120 ? "..." : ""}
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:"auto" }}>
          <span style={{ fontSize:11, color:"#0ea5e9", fontWeight:600 }}>{news.source}</span>
          <span style={{ marginLeft:"auto", fontSize:11, color:"#94a3b8" }}>{news.date} · {news.time}</span>
        </div>
      </div>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [activeRegion,   setActiveRegion]   = useState("todos");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search,         setSearch]         = useState("");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchLoading,  setSearchLoading]  = useState(false);
  const [searchResults,  setSearchResults]  = useState(null);
  const [news,           setNews]           = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setError(null);
      const { data, error: e } = await supabase
        .from("noticias")
        .select("id,titulo,resumo,fonte_nome,url_original,cidade,categoria,regiao,imagem_url,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (!mounted) return;
      if (e) {
        setError("Não foi possível carregar as notícias agora. Tente novamente em alguns instantes.");
        setNews([]);
      } else {
        setNews((data || []).map(mapRow));
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // Pool filtrado por região e categoria
  const pool = news.filter(n => {
    const rm = activeRegion   === "todos" || n.region   === activeRegion;
    const cm = activeCategory === "Todos" || n.category === activeCategory;
    return rm && cm;
  });

  // Vitrine editorial (Home)
  const destaques = selecionarHome(pool, 32, 4);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearchQuery(search); setSearchLoading(true); setSearchResults(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:`Você é o assistente de busca do portal Circular Notícias RJ. Analise a consulta e retorne JSON:
{"interpretation":"O que o usuário busca (1 frase)","regions":["regiões relevantes"],"categories":["categorias relevantes"],"suggestion":"Resposta contextual sobre o tema no RJ (2-3 frases)"}
Responda APENAS com JSON válido, sem markdown.`,
          messages:[{ role:"user", content:`Busca: "${search}"` }]
        })
      });
      const data = await res.json();
      setSearchResults(JSON.parse(data.content.map(i=>i.text||"").join("")));
    } catch {
      setSearchResults({ interpretation:search, suggestion:"Mostrando resultados relacionados à sua busca.", regions:[], categories:[] });
    }
    setSearchLoading(false); setSearch("");
  };

  const todayLabel = new Date().toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"short", year:"numeric" });
  const currentRegionLabel = REGIONS.find(r => r.id === activeRegion)?.label || "Todo o Estado";

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:"#f8fafc", minHeight:"100vh" }}>

      {/* Header */}
      <header style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)", padding:"0 16px", boxShadow:"0 2px 20px rgba(0,0,0,0.3)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:14, paddingBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Logo size={42}/>
              <div>
                <div style={{ color:"#fff", fontWeight:900, fontSize:20, letterSpacing:1, lineHeight:1 }}>CIRCULAR</div>
                <div style={{ color:"#38bdf8", fontWeight:700, fontSize:11, letterSpacing:3 }}>NOTÍCIAS RJ</div>
              </div>
            </div>
            <div style={{ color:"#64748b", fontSize:11 }}>{todayLabel}</div>
          </div>

          <div style={{ display:"flex", gap:8, paddingBottom:10 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSearch()}
              placeholder="🔍  Busque por cidade, tema ou assunto..."
              style={{ flex:1, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"9px 14px", color:"#fff", fontSize:13, outline:"none", minWidth:0 }}/>
            <button onClick={handleSearch} disabled={searchLoading}
              style={{ background:"#3b82f6", border:"none", borderRadius:8, padding:"9px 18px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
              {searchLoading ? "..." : "Buscar"}
            </button>
          </div>

          <div style={{ display:"flex", gap:4, overflowX:"auto", paddingBottom:10, scrollbarWidth:"none" }}>
            {REGIONS.map(r => (
              <button key={r.id} onClick={() => { setActiveRegion(r.id); setSearchResults(null); }}
                style={{ background:activeRegion===r.id?"#3b82f6":"transparent", border:"1px solid "+(activeRegion===r.id?"#3b82f6":"rgba(255,255,255,0.12)"), borderRadius:6, padding:"5px 12px", color:activeRegion===r.id?"#fff":"#94a3b8", fontSize:11, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"20px 16px" }}>

        {/* Resultado de busca */}
        {searchResults && (
          <div style={{ background:"#faf5ff", border:"1px solid #e9d5ff", borderRadius:12, padding:"16px 20px", marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:16 }}>✨</span>
              <span style={{ fontWeight:700, color:"#6d28d9", fontSize:14 }}>Busca: "{searchQuery}"</span>
              <button onClick={() => setSearchResults(null)} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:18 }}>×</button>
            </div>
            <p style={{ margin:"0 0 8px", fontSize:13, color:"#4c1d95" }}><strong>Interpretação:</strong> {searchResults.interpretation}</p>
            <p style={{ margin:0, fontSize:13, color:"#5b21b6", lineHeight:1.6 }}>{searchResults.suggestion}</p>
          </div>
        )}

        {error && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:12, padding:"14px 18px", marginBottom:20, color:"#b91c1c", fontSize:13 }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"#94a3b8" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
            <p style={{ margin:0, fontSize:14 }}>Carregando notícias...</p>
          </div>
        ) : (
          <>
            {/* Cidades da região selecionada */}
            {activeRegion === "lagos" && (
              <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:12, scrollbarWidth:"none" }}>
                {LAGOS_CITIES.map(c => (
                  <span key={c} style={{ background:"#dbeafe", color:"#1d4ed8", fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20, whiteSpace:"nowrap" }}>📍 {c}</span>
                ))}
              </div>
            )}
            {activeRegion === "baixada" && (
              <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:12, scrollbarWidth:"none" }}>
                {BAIXADA_CITIES.map(c => (
                  <span key={c} style={{ background:"#fce7f3", color:"#9d174d", fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20, whiteSpace:"nowrap" }}>📍 {c}</span>
                ))}
              </div>
            )}

            {/* Filtro por categoria */}
            <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:16, paddingBottom:4, scrollbarWidth:"none" }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setActiveCategory(c)}
                  style={{ background:activeCategory===c?"#1e293b":"#fff", border:"1px solid "+(activeCategory===c?"#1e293b":"#e2e8f0"), borderRadius:20, padding:"5px 14px", color:activeCategory===c?"#fff":"#475569", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                  {c}
                </button>
              ))}
            </div>

            {/* Grade de destaques */}
            <div style={{ marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <div style={{ width:3, height:20, background:"#ef4444", borderRadius:2 }}/>
                <h2 style={{ margin:0, fontSize:15, fontWeight:800, color:"#1e293b", letterSpacing:-0.3 }}>
                  {activeRegion === "todos" ? "DESTAQUES DO ESTADO" : currentRegionLabel.toUpperCase()}
                </h2>
                <span style={{ background:"#fee2e2", color:"#dc2626", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10 }}>AO VIVO</span>
                <span style={{ background:"#f1f5f9", color:"#64748b", fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:10, marginLeft:"auto" }}>
                  {destaques.length} notícia{destaques.length !== 1 ? "s" : ""}
                </span>
              </div>

              {destaques.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 20px", color:"#94a3b8" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
                  <p style={{ margin:0, fontSize:14 }}>Nenhuma notícia encontrada para este filtro.</p>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
                  {destaques.map(n => <NewsCard key={n.id} news={n}/>)}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)", marginTop:16, padding:"36px 20px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", flexDirection:"column", alignItems:"center", gap:12, textAlign:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Logo size={38}/>
            <div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:17, letterSpacing:1 }}>CIRCULAR</div>
              <div style={{ color:"#38bdf8", fontWeight:700, fontSize:10, letterSpacing:3 }}>NOTÍCIAS RJ</div>
            </div>
          </div>
          <p style={{ margin:0, fontSize:13, color:"#94a3b8", fontStyle:"italic" }}>
            Tudo o que acontece no Estado do Rio de Janeiro, em um só lugar.
          </p>
          <div style={{ width:40, height:1, background:"rgba(255,255,255,0.1)" }}/>
          <div style={{ fontSize:13, color:"#64748b" }}>
            Contato:{" "}
            <a href="mailto:circularnoticias@gmail.com" style={{ color:"#38bdf8", fontWeight:600, textDecoration:"none" }}>
              circularnoticias@gmail.com
            </a>
          </div>
          <p style={{ margin:0, fontSize:12, color:"#64748b", fontWeight:600 }}>
            Centro Inteligente de Notícias do Estado do Rio de Janeiro.
          </p>
          <p style={{ margin:0, fontSize:11, color:"#475569" }}>
            © 2026 Circular Notícias RJ – Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

// ─── Regiões (inclui Baixada Fluminense como região própria) ───────────────
const REGIONS = [
  { id: "todos",         label: "Todo o Estado" },
  { id: "metropolitana", label: "Região Metropolitana" },
  { id: "baixada",       label: "Baixada Fluminense" },
  { id: "lagos",         label: "Região dos Lagos" },
  { id: "serrana",       label: "Região Serrana" },
  { id: "norte",         label: "Norte Fluminense" },
  { id: "noroeste",      label: "Noroeste Fluminense" },
  { id: "costa-verde",   label: "Costa Verde" },
  { id: "medio-paraiba", label: "Médio Paraíba" },
  { id: "centro-sul",    label: "Centro-Sul Fluminense" },
];

const CATEGORIES = [
  "Todos","Política","Segurança","Economia","Turismo","Saúde",
  "Educação","Tecnologia","Meio Ambiente","Cultura","Esportes",
];

const LAGOS_CITIES = [
  "Cabo Frio","Arraial do Cabo","Armação dos Búzios",
  "São Pedro da Aldeia","Araruama","Saquarema","Iguaba Grande","Casimiro de Abreu",
];

const BAIXADA_CITIES = [
  "Nova Iguaçu","Duque de Caxias","Belford Roxo","Nilópolis",
  "Mesquita","Queimados","São João de Meriti","Japeri","Seropédica","Itaguaí",
];

const VALID_REGION_IDS = REGIONS.map(r => r.id).filter(id => id !== "todos");

// Fontes Oficiais (prefeituras) — limitadas na Home
const FONTES_OFICIAIS = new Set([
  "Prefeitura do Rio","Prefeitura de Niterói","Prefeitura de Cabo Frio",
  "Prefeitura de Volta Redonda","Prefeitura de Casimiro de Abreu","Prefeitura de Macaé",
]);

// ─── Cores e identidade visual ─────────────────────────────────────────────
const categoryColors = {
  "Turismo":"#0ea5e9","Meio Ambiente":"#22c55e","Saúde":"#f43f5e",
  "Segurança":"#f97316","Política":"#8b5cf6","Economia":"#eab308",
  "Educação":"#06b6d4","Tecnologia":"#6366f1","Cultura":"#ec4899",
  "Esportes":"#10b981","Geral":"#64748b",
};

const categoryGradients = {
  "Segurança":    "linear-gradient(135deg,#7c2d12,#ea580c)",
  "Política":     "linear-gradient(135deg,#3b0764,#7c3aed)",
  "Saúde":        "linear-gradient(135deg,#881337,#f43f5e)",
  "Esportes":     "linear-gradient(135deg,#064e3b,#10b981)",
  "Economia":     "linear-gradient(135deg,#713f12,#eab308)",
  "Educação":     "linear-gradient(135deg,#0c4a6e,#06b6d4)",
  "Cultura":      "linear-gradient(135deg,#831843,#ec4899)",
  "Turismo":      "linear-gradient(135deg,#0c4a6e,#0ea5e9)",
  "Meio Ambiente":"linear-gradient(135deg,#14532d,#22c55e)",
  "Tecnologia":   "linear-gradient(135deg,#1e1b4b,#6366f1)",
  "Geral":        "linear-gradient(135deg,#0f172a,#1e3a5f)",
};

const categoryIcons = {
  "Segurança":"🚔","Política":"🏛️","Saúde":"🏥","Esportes":"⚽",
  "Economia":"💰","Educação":"📚","Cultura":"🎭","Turismo":"🏖️",
  "Meio Ambiente":"🌿","Tecnologia":"💻","Geral":"📰",
};

// ─── Mapeamento cidade → região (fallback para registros antigos) ───────────
const CITY_TO_REGION = {
  // Metropolitana
  "Rio de Janeiro":"metropolitana","Niterói":"metropolitana",
  "São Gonçalo":"metropolitana","Itaboraí":"metropolitana",
  "Maricá":"metropolitana","Magé":"metropolitana",
  "Guapimirim":"metropolitana","Rio Bonito":"metropolitana",
  // Baixada Fluminense
  "Nova Iguaçu":"baixada","Duque de Caxias":"baixada",
  "Belford Roxo":"baixada","Nilópolis":"baixada",
  "Mesquita":"baixada","Queimados":"baixada",
  "São João de Meriti":"baixada","Japeri":"baixada",
  "Seropédica":"baixada","Itaguaí":"baixada","Paracambi":"baixada",
  // Lagos
  "Cabo Frio":"lagos","Arraial do Cabo":"lagos","Armação dos Búzios":"lagos",
  "Búzios":"lagos","São Pedro da Aldeia":"lagos","Araruama":"lagos",
  "Saquarema":"lagos","Iguaba Grande":"lagos","Casimiro de Abreu":"lagos",
  // Serrana
  "Petrópolis":"serrana","Teresópolis":"serrana","Nova Friburgo":"serrana",
  "Cachoeiras de Macacu":"serrana","Cordeiro":"serrana","Bom Jardim":"serrana",
  // Norte
  "Campos dos Goytacazes":"norte","Macaé":"norte",
  "São João da Barra":"norte","Quissamã":"norte","Carapebus":"norte",
  // Noroeste
  "Itaperuna":"noroeste","Santo Antônio de Pádua":"noroeste",
  "Miracema":"noroeste","Natividade":"noroeste",
  // Costa Verde
  "Angra dos Reis":"costa-verde","Paraty":"costa-verde","Mangaratiba":"costa-verde",
  // Médio Paraíba
  "Volta Redonda":"medio-paraiba","Barra Mansa":"medio-paraiba",
  "Resende":"medio-paraiba","Barra do Piraí":"medio-paraiba","Itatiaia":"medio-paraiba",
  // Centro-Sul
  "Vassouras":"centro-sul","Valença":"centro-sul","Miguel Pereira":"centro-sul",
};

function normalizeRegiao(r) {
  if (!r) return null;
  if (VALID_REGION_IDS.includes(r)) return r;
  const s = r.toLowerCase();
  if (s.includes("baixada"))                            return "baixada";
  if (s.includes("lagos"))                              return "lagos";
  if (s.includes("serrana"))                            return "serrana";
  if (s.includes("noroeste"))                           return "noroeste";
  if (s.includes("norte"))                              return "norte";
  if (s.includes("costa verde") || s.includes("costa-verde")) return "costa-verde";
  if (s.includes("paraíba") || s.includes("paraiba"))   return "medio-paraiba";
  if (s.includes("centro-sul") || s.includes("centro sul")) return "centro-sul";
  if (s.includes("metropolitana") || s.includes("estado")) return "metropolitana";
  return null;
}

function resolveRegion(row) {
  return normalizeRegiao(row.regiao) || CITY_TO_REGION[row.cidade] || "metropolitana";
}

function stripHtml(raw) {
  if (!raw) return "";
  let t = String(raw).replace(/<[^>]*>/g, " ");
  t = t.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)));
  const E = { amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",hellip:"…" };
  t = t.replace(/&([a-zA-Z]+);/g, (m, n) => E[n] ?? m);
  return t.replace(/\s+/g, " ").trim();
}

function formatDateTime(iso) {
  if (!iso) return { date:"", time:"" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" }),
    time: d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }),
  };
}

function mapRow(row) {
  const { date, time } = formatDateTime(row.created_at);
  return {
    id:        row.id,
    region:    resolveRegion(row),
    city:      row.cidade || "",
    category:  row.categoria || "Geral",
    headline:  stripHtml(row.titulo),
    summary:   stripHtml(row.resumo),
    source:    row.fonte_nome || "",
    sourceUrl: row.url_original || "",
    image:     row.imagem_url || null,
    isOficial: FONTES_OFICIAIS.has(row.fonte_nome),
    date, time,
  };
}

// ─── Algoritmo editorial da Home ───────────────────────────────────────────
// Regras: 1 notícia por fonte, máx 4 oficiais, ~32 cards,
//         variedade de regiões e categorias.
function selecionarHome(pool, maxCards = 32, maxOficiais = 4) {
  // Embaralhamento leve para variar a cada refresh (mantendo recência dominante)
  const shuffled = [...pool].sort((a, b) => {
    // 70% peso por data, 30% aleatório — boa mistura de recente + diverso
    const dataDiff = new Date(b.date) - new Date(a.date);
    return dataDiff * 0.7 + (Math.random() - 0.5) * 0.3 * 1e10;
  });

  const fontesSelecionadas = new Set();
  const categoriaCount    = {};
  let   oficiaisCount     = 0;
  const resultado         = [];

  for (const n of shuffled) {
    if (resultado.length >= maxCards) break;
    if (fontesSelecionadas.has(n.source)) continue;
    if (n.isOficial && oficiaisCount >= maxOficiais) continue;
    // Limitar categoria dominante (máx 6 por categoria)
    const cat = n.category;
    if ((categoriaCount[cat] || 0) >= 6) continue;

    fontesSelecionadas.add(n.source);
    categoriaCount[cat] = (categoriaCount[cat] || 0) + 1;
    if (n.isOficial) oficiaisCount++;
    resultado.push(n);
  }
  return resultado;
}

// ─── Componentes visuais ───────────────────────────────────────────────────
function Logo({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8"/>
          <stop offset="100%" stopColor="#1d4ed8"/>
        </linearGradient>
      </defs>
      <path d="M18 72 Q10 50 18 28" stroke="url(#lg)" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <path d="M28 65 Q22 50 28 35" stroke="url(#lg)" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.8"/>
      <path d="M82 28 Q90 50 82 72" stroke="url(#lg)" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <path d="M72 35 Q78 50 72 65" stroke="url(#lg)" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.8"/>
      <circle cx="50" cy="50" r="10" fill="url(#lg)"/>
      <circle cx="50" cy="50" r="5" fill="#fff"/>
      <line x1="37" y1="50" x2="63" y2="50" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" opacity="0.3"/>
    </svg>
  );
}

function NewsCard({ news }) {
  const color   = categoryColors[news.category] || "#64748b";
  const bgImg   = categoryGradients[news.category] || categoryGradients["Geral"];
  const icon    = categoryIcons[news.category] || "📰";
  const [imgErr, setImgErr] = useState(false);
  const showImg = news.image && !imgErr;

  const open = () => news.sourceUrl && window.open(news.sourceUrl, "_blank", "noopener,noreferrer");

  return (
    <div onClick={open} role="link" tabIndex={0}
      onKeyDown={e => e.key === "Enter" && open()}
      style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", overflow:"hidden", cursor:"pointer", transition:"transform 0.15s,box-shadow 0.15s", display:"flex", flexDirection:"column", border:"1px solid #f1f5f9" }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.07)"; }}>
      <div style={{ width:"100%", height:140, position:"relative", background: showImg ? "#e2e8f0" : bgImg, flexShrink:0 }}>
        {showImg
          ? <img src={news.image} alt={news.headline} onError={() => setImgErr(true)} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:6 }}>
              <span style={{ fontSize:32 }}>{icon}</span>
              <span style={{ color:"rgba(255,255,255,0.7)", fontSize:10, fontWeight:700, letterSpacing:1 }}>{news.category.toUpperCase()}</span>
            </div>
        }
        <div style={{ position:"absolute", bottom:0, left:0, height:4, width:"100%", background:color }}/>
        {news.isOficial && (
          <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:8, letterSpacing:0.5 }}>
            OFICIAL
          </div>
        )}
      </div>
      <div style={{ padding:"14px 16px 16px", flex:1, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={{ background:color+"18", color, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>{news.category}</span>
          {news.city && <span style={{ marginLeft:"auto", fontSize:11, color:"#94a3b8" }}>📍 {news.city}</span>}
        </div>
        <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#1e293b", lineHeight:1.4 }}>{news.headline}</h3>
        <div style={{ display:"flex", alignItems:"flex-start", gap:6, background:"#f8fafc", borderRadius:8, padding:"8px 10px" }}>
          <span style={{ color:"#6366f1", marginTop:1, fontSize:12 }}>✦</span>
          <p style={{ margin:0, fontSize:12, color:"#475569", lineHeight:1.55, flex:1 }}>
            {(news.summary || "").slice(0, 120)}{(news.summary || "").length > 120 ? "..." : ""}
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:"auto" }}>
          <span style={{ fontSize:11, color:"#0ea5e9", fontWeight:600 }}>{news.source}</span>
          <span style={{ marginLeft:"auto", fontSize:11, color:"#94a3b8" }}>{news.date} · {news.time}</span>
        </div>
      </div>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [activeRegion,   setActiveRegion]   = useState("todos");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search,         setSearch]         = useState("");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchLoading,  setSearchLoading]  = useState(false);
  const [searchResults,  setSearchResults]  = useState(null);
  const [news,           setNews]           = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setError(null);
      const { data, error: e } = await supabase
        .from("noticias")
        .select("id,titulo,resumo,fonte_nome,url_original,cidade,categoria,regiao,imagem_url,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (!mounted) return;
      if (e) {
        setError("Não foi possível carregar as notícias agora. Tente novamente em alguns instantes.");
        setNews([]);
      } else {
        setNews((data || []).map(mapRow));
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // Pool filtrado por região e categoria
  const pool = news.filter(n => {
    const rm = activeRegion   === "todos" || n.region   === activeRegion;
    const cm = activeCategory === "Todos" || n.category === activeCategory;
    return rm && cm;
  });

  // Vitrine editorial (Home)
  const destaques = selecionarHome(pool, 32, 4);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearchQuery(search); setSearchLoading(true); setSearchResults(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:`Você é o assistente de busca do portal Circular Notícias RJ. Analise a consulta e retorne JSON:
{"interpretation":"O que o usuário busca (1 frase)","regions":["regiões relevantes"],"categories":["categorias relevantes"],"suggestion":"Resposta contextual sobre o tema no RJ (2-3 frases)"}
Responda APENAS com JSON válido, sem markdown.`,
          messages:[{ role:"user", content:`Busca: "${search}"` }]
        })
      });
      const data = await res.json();
      setSearchResults(JSON.parse(data.content.map(i=>i.text||"").join("")));
    } catch {
      setSearchResults({ interpretation:search, suggestion:"Mostrando resultados relacionados à sua busca.", regions:[], categories:[] });
    }
    setSearchLoading(false); setSearch("");
  };

  const todayLabel = new Date().toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"short", year:"numeric" });
  const currentRegionLabel = REGIONS.find(r => r.id === activeRegion)?.label || "Todo o Estado";

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:"#f8fafc", minHeight:"100vh" }}>

      {/* Header */}
      <header style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)", padding:"0 16px", boxShadow:"0 2px 20px rgba(0,0,0,0.3)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:14, paddingBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Logo size={42}/>
              <div>
                <div style={{ color:"#fff", fontWeight:900, fontSize:20, letterSpacing:1, lineHeight:1 }}>CIRCULAR</div>
                <div style={{ color:"#38bdf8", fontWeight:700, fontSize:11, letterSpacing:3 }}>NOTÍCIAS RJ</div>
              </div>
            </div>
            <div style={{ color:"#64748b", fontSize:11 }}>{todayLabel}</div>
          </div>

          <div style={{ display:"flex", gap:8, paddingBottom:10 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSearch()}
              placeholder="🔍  Busque por cidade, tema ou assunto..."
              style={{ flex:1, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"9px 14px", color:"#fff", fontSize:13, outline:"none", minWidth:0 }}/>
            <button onClick={handleSearch} disabled={searchLoading}
              style={{ background:"#3b82f6", border:"none", borderRadius:8, padding:"9px 18px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
              {searchLoading ? "..." : "Buscar"}
            </button>
          </div>

          <div style={{ display:"flex", gap:4, overflowX:"auto", paddingBottom:10, scrollbarWidth:"none" }}>
            {REGIONS.map(r => (
              <button key={r.id} onClick={() => { setActiveRegion(r.id); setSearchResults(null); }}
                style={{ background:activeRegion===r.id?"#3b82f6":"transparent", border:"1px solid "+(activeRegion===r.id?"#3b82f6":"rgba(255,255,255,0.12)"), borderRadius:6, padding:"5px 12px", color:activeRegion===r.id?"#fff":"#94a3b8", fontSize:11, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"20px 16px" }}>

        {/* Resultado de busca */}
        {searchResults && (
          <div style={{ background:"#faf5ff", border:"1px solid #e9d5ff", borderRadius:12, padding:"16px 20px", marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:16 }}>✨</span>
              <span style={{ fontWeight:700, color:"#6d28d9", fontSize:14 }}>Busca: "{searchQuery}"</span>
              <button onClick={() => setSearchResults(null)} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:18 }}>×</button>
            </div>
            <p style={{ margin:"0 0 8px", fontSize:13, color:"#4c1d95" }}><strong>Interpretação:</strong> {searchResults.interpretation}</p>
            <p style={{ margin:0, fontSize:13, color:"#5b21b6", lineHeight:1.6 }}>{searchResults.suggestion}</p>
          </div>
        )}

        {error && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:12, padding:"14px 18px", marginBottom:20, color:"#b91c1c", fontSize:13 }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"#94a3b8" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
            <p style={{ margin:0, fontSize:14 }}>Carregando notícias...</p>
          </div>
        ) : (
          <>
            {/* Cidades da região selecionada */}
            {activeRegion === "lagos" && (
              <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:12, scrollbarWidth:"none" }}>
                {LAGOS_CITIES.map(c => (
                  <span key={c} style={{ background:"#dbeafe", color:"#1d4ed8", fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20, whiteSpace:"nowrap" }}>📍 {c}</span>
                ))}
              </div>
            )}
            {activeRegion === "baixada" && (
              <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:12, scrollbarWidth:"none" }}>
                {BAIXADA_CITIES.map(c => (
                  <span key={c} style={{ background:"#fce7f3", color:"#9d174d", fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20, whiteSpace:"nowrap" }}>📍 {c}</span>
                ))}
              </div>
            )}

            {/* Filtro por categoria */}
            <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:16, paddingBottom:4, scrollbarWidth:"none" }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setActiveCategory(c)}
                  style={{ background:activeCategory===c?"#1e293b":"#fff", border:"1px solid "+(activeCategory===c?"#1e293b":"#e2e8f0"), borderRadius:20, padding:"5px 14px", color:activeCategory===c?"#fff":"#475569", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                  {c}
                </button>
              ))}
            </div>

            {/* Grade de destaques */}
            <div style={{ marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <div style={{ width:3, height:20, background:"#ef4444", borderRadius:2 }}/>
                <h2 style={{ margin:0, fontSize:15, fontWeight:800, color:"#1e293b", letterSpacing:-0.3 }}>
                  {activeRegion === "todos" ? "DESTAQUES DO ESTADO" : currentRegionLabel.toUpperCase()}
                </h2>
                <span style={{ background:"#fee2e2", color:"#dc2626", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10 }}>AO VIVO</span>
                <span style={{ background:"#f1f5f9", color:"#64748b", fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:10, marginLeft:"auto" }}>
                  {destaques.length} notícia{destaques.length !== 1 ? "s" : ""}
                </span>
              </div>

              {destaques.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 20px", color:"#94a3b8" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
                  <p style={{ margin:0, fontSize:14 }}>Nenhuma notícia encontrada para este filtro.</p>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
                  {destaques.map(n => <NewsCard key={n.id} news={n}/>)}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)", marginTop:16, padding:"36px 20px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", flexDirection:"column", alignItems:"center", gap:12, textAlign:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Logo size={38}/>
            <div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:17, letterSpacing:1 }}>CIRCULAR</div>
              <div style={{ color:"#38bdf8", fontWeight:700, fontSize:10, letterSpacing:3 }}>NOTÍCIAS RJ</div>
            </div>
          </div>
          <p style={{ margin:0, fontSize:13, color:"#94a3b8", fontStyle:"italic" }}>
            Tudo o que acontece no Estado do Rio de Janeiro, em um só lugar.
          </p>
          <div style={{ width:40, height:1, background:"rgba(255,255,255,0.1)" }}/>
          <div style={{ fontSize:13, color:"#64748b" }}>
            Contato:{" "}
            <a href="mailto:circularnoticias@gmail.com" style={{ color:"#38bdf8", fontWeight:600, textDecoration:"none" }}>
              circularnoticias@gmail.com
            </a>
          </div>
          <p style={{ margin:0, fontSize:12, color:"#64748b", fontWeight:600 }}>
            Centro Inteligente de Notícias do Estado do Rio de Janeiro.
          </p>
          <p style={{ margin:0, fontSize:11, color:"#475569" }}>
            © 2026 Circular Notícias RJ – Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
