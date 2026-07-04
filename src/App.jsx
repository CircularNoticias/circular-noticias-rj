import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

const REGIONS = [
  { id: "todos",         label: "Home" },
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

const VALID_REGION_IDS = REGIONS.map(r => r.id).filter(id => id !== "todos");
const CARDS_INICIAIS = 24;
const CARDS_MAIS = 12;
const MAX_HOME_CARDS = 60;

const LAGOS_CITIES = [
  "Cabo Frio","Arraial do Cabo","Armação dos Búzios",
  "São Pedro da Aldeia","Araruama","Saquarema","Iguaba Grande","Casimiro de Abreu",
];
const BAIXADA_CITIES = [
  "Nova Iguaçu","Duque de Caxias","Belford Roxo","Nilópolis",
  "Mesquita","Queimados","São João de Meriti","Japeri","Seropédica","Itaguaí",
];

const FONTES_OFICIAIS = new Set([
  "Prefeitura do Rio","Prefeitura de Niterói","Prefeitura de Cabo Frio",
  "Prefeitura de Volta Redonda","Prefeitura de Casimiro de Abreu",
  "Prefeitura de Macaé","Prefeitura de Itatiaia","Prefeitura de Japeri",
  "Prefeitura de Mangaratiba","Prefeitura de Maricá",
]);

// ─── Algoritmo editorial ────────────────────────────────────────────────────
const PRIORIDADE_BASE = [
  "Segurança","Política","Saúde","Economia",
  "Educação","Turismo","Cultura","Esportes",
  "Meio Ambiente","Tecnologia","Geral",
];

function rotacionar(arr, n) {
  const pos = n % arr.length;
  return [...arr.slice(pos), ...arr.slice(0, pos)];
}

function getPrioridade() {
  return rotacionar(PRIORIDADE_BASE, new Date().getHours() % PRIORIDADE_BASE.length);
}

function organizarHome(pool, maxCards = MAX_HOME_CARDS, maxOficiais = 6) {
  const prioridade = getPrioridade();
  const grupos = {};
  for (const cat of prioridade) grupos[cat] = [];
  for (const n of pool) {
    const cat = n.category in grupos ? n.category : "Geral";
    grupos[cat].push(n);
  }

  const pick = (lista) => {
    const shuffled = [...lista].sort(() => Math.random() - 0.5);
    const usadas = new Set();
    return shuffled.filter(n => {
      if (usadas.has(n.source)) return false;
      usadas.add(n.source);
      return true;
    });
  };

  const listas = prioridade.map(cat => pick(grupos[cat] || []));
  const resultado = [];
  const fontesSel = new Set();
  let oficiais = 0;
  let i = 0;

  while (resultado.length < maxCards) {
    let adicionou = false;
    for (let p = 0; p < listas.length && resultado.length < maxCards; p++) {
      const n = listas[p][i];
      if (!n) continue;
      if (fontesSel.has(n.source)) continue;
      if (n.isOficial && oficiais >= maxOficiais) continue;
      fontesSel.add(n.source);
      if (n.isOficial) oficiais++;
      resultado.push(n);
      adicionou = true;
    }
    i++;
    if (!adicionou) break;
  }
  return resultado;
}

// ─── Visual ──────────────────────────────────────────────────────────────────
const categoryColors = {
  "Turismo":"#0ea5e9","Meio Ambiente":"#22c55e","Saúde":"#f43f5e",
  "Segurança":"#f97316","Política":"#8b5cf6","Economia":"#eab308",
  "Educação":"#06b6d4","Tecnologia":"#6366f1","Cultura":"#ec4899",
  "Esportes":"#10b981","Geral":"#64748b",
};

const categoryGradients = {
  "Segurança":"linear-gradient(135deg,#7c2d12,#ea580c)",
  "Política":"linear-gradient(135deg,#3b0764,#7c3aed)",
  "Saúde":"linear-gradient(135deg,#881337,#f43f5e)",
  "Esportes":"linear-gradient(135deg,#064e3b,#10b981)",
  "Economia":"linear-gradient(135deg,#713f12,#eab308)",
  "Educação":"linear-gradient(135deg,#0c4a6e,#06b6d4)",
  "Cultura":"linear-gradient(135deg,#831843,#ec4899)",
  "Turismo":"linear-gradient(135deg,#0c4a6e,#0ea5e9)",
  "Meio Ambiente":"linear-gradient(135deg,#14532d,#22c55e)",
  "Tecnologia":"linear-gradient(135deg,#1e1b4b,#6366f1)",
  "Geral":"linear-gradient(135deg,#0f172a,#1e3a5f)",
};

const categoryIcons = {
  "Segurança":"🚔","Política":"🏛️","Saúde":"🏥","Esportes":"⚽",
  "Economia":"💰","Educação":"📚","Cultura":"🎭","Turismo":"🏖️",
  "Meio Ambiente":"🌿","Tecnologia":"💻","Geral":"📰",
};

const CITY_TO_REGION = {
  "Rio de Janeiro":"metropolitana","Niterói":"metropolitana",
  "São Gonçalo":"metropolitana","Itaboraí":"metropolitana",
  "Maricá":"metropolitana","Magé":"metropolitana",
  "Guapimirim":"metropolitana","Rio Bonito":"metropolitana",
  "Nova Iguaçu":"baixada","Duque de Caxias":"baixada",
  "Belford Roxo":"baixada","Nilópolis":"baixada","Mesquita":"baixada",
  "Queimados":"baixada","São João de Meriti":"baixada","Japeri":"baixada",
  "Seropédica":"baixada","Itaguaí":"baixada","Paracambi":"baixada",
  "Cabo Frio":"lagos","Arraial do Cabo":"lagos","Armação dos Búzios":"lagos",
  "Búzios":"lagos","São Pedro da Aldeia":"lagos","Araruama":"lagos",
  "Saquarema":"lagos","Iguaba Grande":"lagos","Casimiro de Abreu":"lagos",
  "Petrópolis":"serrana","Teresópolis":"serrana","Nova Friburgo":"serrana",
  "Cachoeiras de Macacu":"serrana","Cordeiro":"serrana","Bom Jardim":"serrana",
  "Campos dos Goytacazes":"norte","Macaé":"norte","São João da Barra":"norte",
  "Itaperuna":"noroeste","Santo Antônio de Pádua":"noroeste","Miracema":"noroeste",
  "Angra dos Reis":"costa-verde","Paraty":"costa-verde","Mangaratiba":"costa-verde",
  "Volta Redonda":"medio-paraiba","Barra Mansa":"medio-paraiba",
  "Resende":"medio-paraiba","Itatiaia":"medio-paraiba",
  "Vassouras":"centro-sul","Valença":"centro-sul","Miguel Pereira":"centro-sul",
};

function normalizeRegiao(r) {
  if (!r) return null;
  if (VALID_REGION_IDS.includes(r)) return r;
  const s = r.toLowerCase();
  if (s.includes("baixada"))    return "baixada";
  if (s.includes("lagos"))      return "lagos";
  if (s.includes("serrana"))    return "serrana";
  if (s.includes("noroeste"))   return "noroeste";
  if (s.includes("norte"))      return "norte";
  if (s.includes("costa verde") || s.includes("costa-verde")) return "costa-verde";
  if (s.includes("paraíba") || s.includes("paraiba")) return "medio-paraiba";
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
    id: row.id, region: resolveRegion(row), city: row.cidade || "",
    category: row.categoria || "Geral", headline: stripHtml(row.titulo),
    summary: stripHtml(row.resumo), source: row.fonte_nome || "",
    sourceUrl: row.url_original || "", image: row.imagem_url || null,
    isOficial: FONTES_OFICIAIS.has(row.fonte_nome), date, time,
  };
}

// ─── Componentes ──────────────────────────────────────────────────────────────
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
  const color  = categoryColors[news.category] || "#64748b";
  const bgImg  = categoryGradients[news.category] || categoryGradients["Geral"];
  const icon   = categoryIcons[news.category] || "📰";
  const [imgErr, setImgErr] = useState(false);
  const showImg = news.image && !imgErr;
  const open = () => news.sourceUrl && window.open(news.sourceUrl, "_blank", "noopener,noreferrer");

  return (
    <div onClick={open} role="link" tabIndex={0}
      onKeyDown={e => e.key === "Enter" && open()}
      style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", overflow:"hidden", cursor:"pointer", transition:"transform 0.15s,box-shadow 0.15s", display:"flex", flexDirection:"column", border:"1px solid #f1f5f9" }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.07)"; }}>
      <div style={{ width:"100%", height:160, position:"relative", background: showImg ? "#e2e8f0" : bgImg, flexShrink:0 }}>
        {showImg
          ? <img src={news.image} alt={news.headline} onError={() => setImgErr(true)} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:6 }}>
              <span style={{ fontSize:36 }}>{icon}</span>
              <span style={{ color:"rgba(255,255,255,0.7)", fontSize:10, fontWeight:700, letterSpacing:1 }}>{news.category.toUpperCase()}</span>
            </div>
        }
        <div style={{ position:"absolute", bottom:0, left:0, height:4, width:"100%", background:color }}/>
        {news.isOficial && (
          <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:8 }}>OFICIAL</div>
        )}
      </div>
      <div style={{ padding:"16px 18px 18px", flex:1, display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={{ background:color+"18", color, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>{news.category}</span>
          {news.city && <span style={{ marginLeft:"auto", fontSize:11, color:"#94a3b8" }}>📍 {news.city}</span>}
        </div>
        <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:"#1e293b", lineHeight:1.4 }}>{news.headline}</h3>
        <div style={{ display:"flex", alignItems:"flex-start", gap:6, background:"#f8fafc", borderRadius:8, padding:"10px 12px" }}>
          <span style={{ color:"#6366f1", marginTop:2, fontSize:13 }}>✦</span>
          <p style={{ margin:0, fontSize:14, color:"#475569", lineHeight:1.65, flex:1 }}>
            {(news.summary || "").slice(0, 160)}{(news.summary || "").length > 160 ? "..." : ""}
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:"auto" }}>
          <span style={{ fontSize:12, color:"#0ea5e9", fontWeight:700 }}>{news.source}</span>
          <span style={{ marginLeft:"auto", fontSize:11, color:"#94a3b8" }}>{news.date} · {news.time}</span>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeRegion, setActiveRegion] = useState("todos");
  const [news,         setNews]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [visiveis,     setVisiveis]     = useState(CARDS_INICIAIS);

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
        setError("Não foi possível carregar as notícias agora. Tente novamente.");
        setNews([]);
      } else {
        setNews((data || []).map(mapRow));
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // Resetar cards visíveis ao trocar região
  useEffect(() => { setVisiveis(CARDS_INICIAIS); }, [activeRegion]);

  const pool = activeRegion === "todos"
    ? news
    : news.filter(n => n.region === activeRegion);

  const todosCards = organizarHome(pool, MAX_HOME_CARDS, 6);
  const cardsMostrados = todosCards.slice(0, visiveis);
  const temMais = visiveis < todosCards.length;

  const todayLabel = new Date().toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"short", year:"numeric" });
  const regionLabel = REGIONS.find(r => r.id === activeRegion)?.label || "Home";

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:"#f8fafc", minHeight:"100vh" }}>
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

          {/* Slogan */}
          <div style={{ paddingBottom:12, paddingTop:2 }}>
            <p style={{ margin:0, color:"rgba(255,255,255,0.65)", fontSize:13, fontStyle:"italic", letterSpacing:0.3 }}>
              Tudo o que acontece no Estado do Rio de Janeiro, em um só lugar.
            </p>
          </div>

          {/* Regiões */}
          <div style={{ display:"flex", gap:4, overflowX:"auto", paddingBottom:10, scrollbarWidth:"none" }}>
            {REGIONS.map(r => (
              <button key={r.id} onClick={() => setActiveRegion(r.id)}
                style={{ background:activeRegion===r.id?"#3b82f6":"transparent", border:"1px solid "+(activeRegion===r.id?"#3b82f6":"rgba(255,255,255,0.12)"), borderRadius:6, padding:"5px 12px", color:activeRegion===r.id?"#fff":"#94a3b8", fontSize:11, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"20px 16px" }}>
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

            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <div style={{ width:3, height:20, background:"#ef4444", borderRadius:2 }}/>
              <h2 style={{ margin:0, fontSize:15, fontWeight:800, color:"#1e293b", letterSpacing:-0.3 }}>
                {activeRegion === "todos" ? "HOME" : regionLabel.toUpperCase()}
              </h2>
              <span style={{ background:"#fee2e2", color:"#dc2626", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10 }}>AO VIVO</span>
              <span style={{ background:"#f1f5f9", color:"#64748b", fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:10, marginLeft:"auto" }}>
                {cardsMostrados.length} notícia{cardsMostrados.length !== 1 ? "s" : ""}
              </span>
            </div>

            {cardsMostrados.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 20px", color:"#94a3b8" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
                <p style={{ margin:0, fontSize:14 }}>Nenhuma notícia encontrada para esta região.</p>
              </div>
            ) : (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
                  {cardsMostrados.map(n => <NewsCard key={n.id} news={n}/>)}
                </div>

                {/* Botão Mais notícias */}
                {temMais && (
                  <div style={{ textAlign:"center", marginTop:28 }}>
                    <button onClick={() => setVisiveis(v => v + CARDS_MAIS)}
                      style={{ background:"#1e293b", color:"#fff", border:"none", borderRadius:10, padding:"12px 32px", fontSize:14, fontWeight:700, cursor:"pointer", transition:"background 0.15s", letterSpacing:0.3 }}
                      onMouseEnter={e => e.currentTarget.style.background="#3b82f6"}
                      onMouseLeave={e => e.currentTarget.style.background="#1e293b"}>
                      ↓ Mais notícias
                    </button>
                    <p style={{ margin:"8px 0 0", fontSize:12, color:"#94a3b8" }}>
                      Mostrando {cardsMostrados.length} de {todosCards.length}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <footer style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)", marginTop:24, padding:"36px 20px 24px" }}>
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
