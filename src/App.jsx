import { useState } from "react";

const REGIONS = [
  { id: "todos", label: "Todo o Estado" },
  { id: "metropolitana", label: "Região Metropolitana" },
  { id: "lagos", label: "Região dos Lagos" },
  { id: "serrana", label: "Região Serrana" },
  { id: "norte", label: "Norte Fluminense" },
  { id: "noroeste", label: "Noroeste Fluminense" },
  { id: "costa-verde", label: "Costa Verde" },
  { id: "medio-paraiba", label: "Médio Paraíba" },
  { id: "centro-sul", label: "Centro-Sul Fluminense" },
];

const CATEGORIES = ["Todos","Política","Segurança","Economia","Turismo","Saúde","Educação","Tecnologia","Meio Ambiente"];
const LAGOS_CITIES = ["Cabo Frio","Arraial do Cabo","Armação dos Búzios","São Pedro da Aldeia","Araruama","Saquarema","Iguaba Grande"];

const NEWS = [
  { id:1, region:"lagos", city:"Cabo Frio", category:"Turismo", headline:"Cabo Frio registra recorde de turistas no feriadão de Junho", summary:"O município de Cabo Frio registrou movimento histórico nas praias e pousadas durante o feriado prolongado. A Secretaria de Turismo estima mais de 120 mil visitantes, gerando impacto positivo no comércio local e na rede hoteleira da cidade.", source:"O Globo", sourceUrl:"#", date:"08/06/2026", time:"09:14", related:["Extra","G1 RJ"], tag:"DESTAQUE" },
  { id:2, region:"lagos", city:"Armação dos Búzios", category:"Turismo", headline:"Búzios lança programa de sustentabilidade para preservar praias", summary:"A Prefeitura de Búzios apresentou o programa 'Búzios Limpo', que prevê coleta seletiva nas praias, restrição de plástico descartável e criação de pontos de reciclagem em toda a orla. A iniciativa conta com parceria de ONGs ambientais.", source:"RJ Notícias", sourceUrl:"#", date:"08/06/2026", time:"08:30", related:["Diário de Búzios"], tag:"" },
  { id:3, region:"lagos", city:"Arraial do Cabo", category:"Meio Ambiente", headline:"Arraial do Cabo monitora qualidade da água com nova tecnologia", summary:"A Reserva Extrativista Marinha de Arraial do Cabo passa a contar com sensores subaquáticos que monitoram em tempo real a temperatura e qualidade da água. O projeto é uma parceria entre a prefeitura e universidades federais do Rio.", source:"Folha do Lagos", sourceUrl:"#", date:"08/06/2026", time:"07:55", related:[], tag:"" },
  { id:4, region:"lagos", city:"Araruama", category:"Saúde", headline:"Araruama inaugura UPA com atendimento 24h na região lagunar", summary:"A nova Unidade de Pronto Atendimento de Araruama abre as portas nesta semana, oferecendo serviços médicos ininterruptos à população. A unidade conta com pronto-socorro, laboratório e leitos de observação.", source:"A Voz do Lagos", sourceUrl:"#", date:"07/06/2026", time:"18:00", related:["O São Pedro"], tag:"NOVO" },
  { id:5, region:"metropolitana", city:"Rio de Janeiro", category:"Segurança", headline:"Operação policial reduz índice de roubos na Zona Norte em 30%", summary:"Dados da Secretaria de Segurança Pública indicam queda expressiva nos crimes de roubo em bairros da Zona Norte após intensificação do policiamento ostensivo. A operação, em andamento há 45 dias, já resultou em mais de 200 prisões.", source:"G1 RJ", sourceUrl:"#", date:"08/06/2026", time:"10:00", related:["Extra","O Globo"], tag:"DESTAQUE" },
  { id:6, region:"metropolitana", city:"Rio de Janeiro", category:"Política", headline:"Câmara Municipal do Rio aprova novo plano diretor da cidade", summary:"Vereadores aprovaram por maioria o novo Plano Diretor do Rio de Janeiro, que regulamenta o uso do solo, expansão urbana e zonas de preservação ambiental. O texto segue agora para sanção do prefeito.", source:"O Globo", sourceUrl:"#", date:"08/06/2026", time:"11:30", related:["Globo News"], tag:"" },
  { id:7, region:"serrana", city:"Petrópolis", category:"Economia", headline:"Petrópolis atrai R$ 200 milhões em investimentos no setor têxtil", summary:"O tradicional polo têxtil de Petrópolis anuncia a chegada de três novas indústrias, gerando estimativa de 1.500 empregos diretos nos próximos dois anos. O investimento inclui fábricas de moda sustentável voltadas para exportação.", source:"Correio Serrano", sourceUrl:"#", date:"07/06/2026", time:"14:20", related:[], tag:"" },
  { id:8, region:"norte", city:"Campos dos Goytacazes", category:"Tecnologia", headline:"Campos inaugura hub de tecnologia e startups no interior do estado", summary:"O Norte Fluminense ganha seu primeiro hub oficial de inovação, instalado em Campos dos Goytacazes. O espaço oferece infraestrutura para startups, mentorias e conexão com investidores, com foco em agro-tech e energia limpa.", source:"Folha do Norte", sourceUrl:"#", date:"07/06/2026", time:"09:00", related:["Portal Campos"], tag:"NOVO" },
  { id:9, region:"costa-verde", city:"Angra dos Reis", category:"Turismo", headline:"Angra dos Reis abre temporada de mergulho com roteiros inéditos", summary:"A Costa Verde apresenta novos roteiros de mergulho nas ilhas de Angra dos Reis, incluindo acesso a naufrágios históricos e corais preservados. A temporada promete atrair mergulhadores de todo o Brasil e do exterior.", source:"Costa Verde News", sourceUrl:"#", date:"08/06/2026", time:"08:00", related:[], tag:"" },
  { id:10, region:"lagos", city:"São Pedro da Aldeia", category:"Educação", headline:"São Pedro da Aldeia expande rede de escolas em tempo integral", summary:"O município anunciou a ampliação do programa de educação em tempo integral, que passará a atender mais 3.000 alunos a partir do segundo semestre. Novas unidades escolares serão construídas nos bairros periféricos da cidade.", source:"Diário Regional", sourceUrl:"#", date:"07/06/2026", time:"16:45", related:[], tag:"" },
  { id:11, region:"metropolitana", city:"Niterói", category:"Meio Ambiente", headline:"Niterói investe em energia solar em prédios públicos municipais", summary:"A Prefeitura de Niterói anunciou a instalação de painéis solares em 40 unidades públicas, entre escolas, postos de saúde e secretarias. A medida deve reduzir em 25% os gastos com energia elétrica do município.", source:"Niterói News", sourceUrl:"#", date:"08/06/2026", time:"07:00", related:[], tag:"" },
  { id:12, region:"medio-paraiba", city:"Volta Redonda", category:"Economia", headline:"Volta Redonda retoma produção siderúrgica com novos contratos", summary:"A CSN anuncia retomada de dois altos-fornos em Volta Redonda, após fechar acordos com montadoras nacionais e internacionais. A medida deve reincorporar mais de 800 trabalhadores ao quadro de funcionários ainda neste semestre.", source:"Diário do Aço", sourceUrl:"#", date:"07/06/2026", time:"13:00", related:["Folha do Vale"], tag:"" },
];

const categoryColors = {
  "Turismo":"#0ea5e9","Meio Ambiente":"#22c55e","Saúde":"#f43f5e",
  "Segurança":"#f97316","Política":"#8b5cf6","Economia":"#eab308",
  "Educação":"#06b6d4","Tecnologia":"#6366f1",
};

function Logo({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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

function NewsCard({ news, onClick }) {
  const color = categoryColors[news.category] || "#64748b";
  return (
    <div onClick={() => onClick(news)}
      style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", overflow:"hidden", cursor:"pointer", transition:"transform 0.15s, box-shadow 0.15s", display:"flex", flexDirection:"column", border:"1px solid #f1f5f9" }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.07)"; }}>
      <div style={{ height:4, background:color }}/>
      <div style={{ padding:"14px 16px 16px", flex:1, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={{ background:color+"18", color, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>{news.category}</span>
          {news.tag && <span style={{ background:"#fef3c7", color:"#92400e", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20 }}>{news.tag}</span>}
          <span style={{ marginLeft:"auto", fontSize:11, color:"#94a3b8" }}>📍 {news.city}</span>
        </div>
        <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#1e293b", lineHeight:1.4 }}>{news.headline}</h3>
        <div style={{ display:"flex", alignItems:"flex-start", gap:6, background:"#f8fafc", borderRadius:8, padding:"8px 10px" }}>
          <span style={{ color:"#6366f1", marginTop:1, fontSize:12 }}>✦</span>
          <p style={{ margin:0, fontSize:12, color:"#475569", lineHeight:1.55, flex:1 }}>{news.summary.slice(0,120)}...</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:"auto" }}>
          <span style={{ fontSize:11, color:"#0ea5e9", fontWeight:600 }}>{news.source}</span>
          {news.related.length > 0 && <span style={{ fontSize:10, color:"#94a3b8" }}>+{news.related.length} fonte{news.related.length>1?"s":""}</span>}
          <span style={{ marginLeft:"auto", fontSize:11, color:"#94a3b8" }}>{news.date} · {news.time}</span>
        </div>
      </div>
    </div>
  );
}

function Modal({ news, onClose, aiLoading, aiResponse, onGenerateAI }) {
  const color = categoryColors[news.category] || "#64748b";
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:16, maxWidth:560, width:"100%", maxHeight:"85vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ height:5, background:color, borderRadius:"16px 16px 0 0" }}/>
        <div style={{ padding:"20px 24px 24px" }}>
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            <span style={{ background:color+"18", color, fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>{news.category}</span>
            <span style={{ background:"#e0f2fe", color:"#0369a1", fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:20 }}>📍 {news.city}</span>
          </div>
          <h2 style={{ margin:"0 0 16px", fontSize:18, fontWeight:800, color:"#1e293b", lineHeight:1.4 }}>{news.headline}</h2>
          <div style={{ background:"#f1f5f9", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
              <span style={{ color:"#6366f1" }}>✦</span>
              <span style={{ fontSize:12, fontWeight:700, color:"#6366f1" }}>Resumo</span>
            </div>
            <p style={{ margin:0, fontSize:13, color:"#334155", lineHeight:1.6 }}>{news.summary}</p>
          </div>
          <div style={{ marginBottom:16 }}>
            <button onClick={onGenerateAI} disabled={aiLoading} style={{ background:aiLoading?"#e2e8f0":"linear-gradient(135deg,#6366f1,#8b5cf6)", color:aiLoading?"#94a3b8":"#fff", border:"none", borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:600, cursor:aiLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:6 }}>
              {aiLoading ? "⏳ Gerando análise..." : "✨ Análise Aprofundada"}
            </button>
            {aiResponse && (
              <div style={{ marginTop:12, background:"#faf5ff", border:"1px solid #e9d5ff", borderRadius:10, padding:"12px 14px" }}>
                <p style={{ margin:0, fontSize:13, color:"#4c1d95", lineHeight:1.65 }}>{aiResponse}</p>
              </div>
            )}
          </div>
          <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:14 }}>
            <p style={{ margin:"0 0 6px", fontSize:12, color:"#64748b", fontWeight:600 }}>FONTES</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <a href={news.sourceUrl} style={{ background:"#dbeafe", color:"#1d4ed8", fontSize:12, fontWeight:600, padding:"4px 12px", borderRadius:20, textDecoration:"none" }}>🔗 {news.source}</a>
              {news.related.map(r=><span key={r} style={{ background:"#f1f5f9", color:"#64748b", fontSize:12, padding:"4px 12px", borderRadius:20 }}>{r}</span>)}
            </div>
            <p style={{ margin:"12px 0 0", fontSize:11, color:"#94a3b8" }}>Publicado em {news.date} às {news.time}</p>
          </div>
          <button onClick={onClose} style={{ marginTop:16, width:"100%", background:"#f1f5f9", color:"#475569", border:"none", borderRadius:8, padding:"10px", fontSize:13, fontWeight:600, cursor:"pointer" }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeRegion, setActiveRegion] = useState("todos");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNews, setSelectedNews] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const filtered = NEWS.filter(n => {
    const regionMatch = activeRegion === "todos" || n.region === activeRegion;
    const categoryMatch = activeCategory === "Todos" || n.category === activeCategory;
    return regionMatch && categoryMatch;
  });

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearchQuery(search);
    setSearchLoading(true);
    setSearchResults(null);
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
      const text = data.content.map(i=>i.text||"").join("");
      setSearchResults(JSON.parse(text));
    } catch {
      setSearchResults({ interpretation:search, suggestion:"Mostrando resultados relacionados à sua busca.", regions:[], categories:[] });
    }
    setSearchLoading(false);
    setSearch("");
  };

  const handleGenerateAI = async () => {
    if (!selectedNews) return;
    setAiLoading(true); setAiResponse("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:`Você é um analista de notícias do portal Circular Notícias RJ. Forneça uma análise aprofundada e contextualizada da notícia sobre o Rio de Janeiro. Seja objetivo, informativo, neutro e destaque impactos para a população local. Máximo 4 parágrafos curtos.`,
          messages:[{ role:"user", content:`Analise:\nTítulo: ${selectedNews.headline}\nResumo: ${selectedNews.summary}\nCidade: ${selectedNews.city}\nCategoria: ${selectedNews.category}` }]
        })
      });
      const data = await res.json();
      setAiResponse(data.content.map(i=>i.text||"").join(""));
    } catch { setAiResponse("Não foi possível gerar a análise no momento. Tente novamente."); }
    setAiLoading(false);
  };

  const openNews = (news) => { setSelectedNews(news); setAiResponse(""); };
  const highlights = NEWS.filter(n => n.tag === "DESTAQUE");

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
            <div style={{ color:"#64748b", fontSize:11 }}>Seg, 08 Jun 2026</div>
          </div>
          <div style={{ display:"flex", gap:8, paddingBottom:10 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}
              placeholder="🔍  Busque por cidade, tema ou assunto..."
              style={{ flex:1, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"9px 14px", color:"#fff", fontSize:13, outline:"none", minWidth:0 }}/>
            <button onClick={handleSearch} disabled={searchLoading}
              style={{ background:"#3b82f6", border:"none", borderRadius:8, padding:"9px 18px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
              {searchLoading ? "..." : "Buscar"}
            </button>
          </div>
          <div style={{ display:"flex", gap:4, overflowX:"auto", paddingBottom:10, scrollbarWidth:"none" }}>
            {REGIONS.map(r=>(
              <button key={r.id} onClick={()=>{ setActiveRegion(r.id); setSearchResults(null); }}
                style={{ background:activeRegion===r.id?"#3b82f6":"transparent", border:"1px solid "+(activeRegion===r.id?"#3b82f6":"rgba(255,255,255,0.12)"), borderRadius:6, padding:"5px 12px", color:activeRegion===r.id?"#fff":"#94a3b8", fontSize:11, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"20px 16px" }}>
        {searchResults && (
          <div style={{ background:"#faf5ff", border:"1px solid #e9d5ff", borderRadius:12, padding:"16px 20px", marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:16 }}>✨</span>
              <span style={{ fontWeight:700, color:"#6d28d9", fontSize:14 }}>Busca: "{searchQuery}"</span>
              <button onClick={()=>setSearchResults(null)} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:18 }}>×</button>
            </div>
            <p style={{ margin:"0 0 8px", fontSize:13, color:"#4c1d95" }}><strong>Interpretação:</strong> {searchResults.interpretation}</p>
            <p style={{ margin:0, fontSize:13, color:"#5b21b6", lineHeight:1.6 }}>{searchResults.suggestion}</p>
          </div>
        )}

        {activeRegion==="todos" && !searchResults && (
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ width:3, height:20, background:"#ef4444", borderRadius:2 }}/>
              <h2 style={{ margin:0, fontSize:15, fontWeight:800, color:"#1e293b", letterSpacing:-0.3 }}>DESTAQUES DO ESTADO</h2>
              <span style={{ background:"#fee2e2", color:"#dc2626", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10 }}>AO VIVO</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
              {highlights.map(n=><NewsCard key={n.id} news={n} onClick={openNews}/>)}
            </div>
          </div>
        )}

        {activeRegion==="lagos" && (
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, scrollbarWidth:"none" }}>
              {LAGOS_CITIES.map(c=>(
                <span key={c} style={{ background:"#dbeafe", color:"#1d4ed8", fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20, whiteSpace:"nowrap", cursor:"pointer" }}>📍 {c}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:16, paddingBottom:4, scrollbarWidth:"none" }}>
          {CATEGORIES.map(c=>(
            <button key={c} onClick={()=>setActiveCategory(c)}
              style={{ background:activeCategory===c?"#1e293b":"#fff", border:"1px solid "+(activeCategory===c?"#1e293b":"#e2e8f0"), borderRadius:20, padding:"5px 14px", color:activeCategory===c?"#fff":"#475569", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s" }}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:3, height:18, background:"#3b82f6", borderRadius:2 }}/>
            <h2 style={{ margin:0, fontSize:14, fontWeight:800, color:"#1e293b" }}>
              {activeRegion==="todos" ? "TODAS AS NOTÍCIAS" : REGIONS.find(r=>r.id===activeRegion)?.label.toUpperCase()}
            </h2>
            <span style={{ background:"#f1f5f9", color:"#64748b", fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:10 }}>
              {filtered.length} notícia{filtered.length!==1?"s":""}
            </span>
          </div>
          {filtered.length===0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px", color:"#94a3b8" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
              <p style={{ margin:0, fontSize:14 }}>Nenhuma notícia encontrada para este filtro.</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
              {filtered.map(n=><NewsCard key={n.id} news={n} onClick={openNews}/>)}
            </div>
          )}
        </div>
      </div>

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

      {selectedNews && (
        <Modal news={selectedNews} onClose={()=>setSelectedNews(null)} aiLoading={aiLoading} aiResponse={aiResponse} onGenerateAI={handleGenerateAI}/>
      )}
    </div>
  );
}