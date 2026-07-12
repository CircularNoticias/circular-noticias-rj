import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const REGIAO_LABELS = {
  metropolitana: "Região Metropolitana",
  baixada: "Baixada Fluminense",
  lagos: "Região dos Lagos",
  serrana: "Região Serrana",
  norte: "Norte Fluminense",
  noroeste: "Noroeste Fluminense",
  "costa-verde": "Costa Verde",
  "medio-paraiba": "Médio Paraíba",
  "centro-sul": "Centro-Sul Fluminense",
};

const ORIGEM_LABELS = {
  rss: "RSS direto",
  og: "Open Graph",
  conteudo: "Extraído do conteúdo",
  fallback: "Fallback institucional",
};

// ─── Barra horizontal simples, sem dependência de biblioteca de gráficos ──
function BarList({ data, labelMap, colorFn, maxItems = 10 }) {
  const items = (data || []).slice(0, maxItems);
  const max = Math.max(1, ...items.map(d => d.total));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((d, i) => {
        const label = labelMap ? (labelMap[d.key] || d.key || "—") : (d.key || "—");
        const pct = Math.round((d.total / max) * 100);
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginBottom: 3 }}>
              <span>{label}</span>
              <span style={{ fontWeight: 700 }}>{d.total}</span>
            </div>
            <div style={{ background: "#f1f5f9", borderRadius: 6, height: 10, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: colorFn ? colorFn(i) : "#3b82f6", borderRadius: 6 }} />
            </div>
          </div>
        );
      })}
      {items.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8" }}>Sem dados no período.</div>}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 18, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#1e293b", fontWeight: 700 }}>{title}</h3>
      {children}
    </div>
  );
}

export function AdminInsights() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [regiao, setRegiao] = useState([]);
  const [categoria, setCategoria] = useState([]);
  const [crescimento, setCrescimento] = useState([]);
  const [imagemOrigem, setImagemOrigem] = useState([]);
  const [fontes7d, setFontes7d] = useState([]);
  const [fontes30d, setFontes30d] = useState([]);
  const [municipios, setMunicipios] = useState([]);

  const carregar = async () => {
    setLoading(true);
    const [
      { data: r1 }, { data: r2 }, { data: r3 }, { data: r4 },
      { data: r5 }, { data: r6 }, { data: r7 },
    ] = await Promise.all([
      supabase.from("insights_regiao").select("*"),
      supabase.from("insights_categoria").select("*"),
      supabase.from("insights_crescimento_diario").select("*"),
      supabase.from("insights_imagem_origem").select("*"),
      supabase.from("insights_fontes_7d").select("*"),
      supabase.from("insights_fontes_30d").select("*"),
      supabase.from("insights_municipios").select("*"),
    ]);
    setRegiao((r1 || []).map(d => ({ key: d.regiao, total: d.total })));
    setCategoria((r2 || []).map(d => ({ key: d.categoria, total: d.total })));
    setCrescimento(r3 || []);
    setImagemOrigem((r4 || []).map(d => ({ key: d.imagem_origem, total: d.total })));
    setFontes7d((r5 || []).map(d => ({ key: d.fonte_nome, total: d.total })));
    setFontes30d((r6 || []).map(d => ({ key: d.fonte_nome, total: d.total })));
    setMunicipios((r7 || []).map(d => ({ key: d.cidade, total: d.total })));
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const totalImagens = imagemOrigem.reduce((s, d) => s + d.total, 0) || 1;
  const totalReal = imagemOrigem.filter(d => d.key !== "fallback").reduce((s, d) => s + d.total, 0);
  const percentualSucesso = ((totalReal / totalImagens) * 100).toFixed(1);

  const maxCrescimento = Math.max(1, ...crescimento.map(d => d.total));

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 20, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 20, color: "#1e293b", margin: 0 }}>Indicadores Editoriais</h1>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Últimos 30 dias (exceto onde indicado)</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => navigate("/admin")} style={{ background: "#e2e8f0", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}>← Saúde das fontes</button>
            <button onClick={carregar} style={{ background: "#e2e8f0", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}>Atualizar</button>
          </div>
        </div>

        {loading ? <p>Carregando...</p> : (
          <>
            <Card title="📈 Crescimento diário">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100, overflowX: "auto" }}>
                {crescimento.map((d, i) => (
                  <div key={i} title={`${d.dia}: ${d.total}`} style={{
                    flex: "0 0 auto", width: 10,
                    height: `${Math.max(4, (d.total / maxCrescimento) * 100)}%`,
                    background: "#3b82f6", borderRadius: 2,
                  }} />
                ))}
                {crescimento.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8" }}>Sem dados no período.</div>}
              </div>
              {crescimento.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                  <span>{crescimento[0].dia}</span>
                  <span>{crescimento[crescimento.length - 1].dia}</span>
                </div>
              )}
            </Card>

            <Card title="🖼️ Recuperação de imagens">
              <div style={{ fontSize: 28, fontWeight: 800, color: "#22c55e", marginBottom: 12 }}>
                {percentualSucesso}% <span style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8" }}>imagem real (não-fallback)</span>
              </div>
              <BarList data={imagemOrigem} labelMap={ORIGEM_LABELS} />
            </Card>

            <Card title="📍 Distribuição por região">
              <BarList data={regiao} labelMap={REGIAO_LABELS} />
            </Card>

            <Card title="🏷️ Distribuição por categoria">
              <BarList data={categoria} maxItems={12} />
            </Card>

            <Card title="🏆 Fontes mais produtivas (7 dias)">
              <BarList data={fontes7d} colorFn={() => "#8b5cf6"} />
            </Card>

            <Card title="🏆 Fontes mais produtivas (30 dias)">
              <BarList data={fontes30d} colorFn={() => "#8b5cf6"} />
            </Card>

            <Card title="🏙️ Municípios com mais cobertura">
              <BarList data={municipios} maxItems={15} colorFn={() => "#f97316"} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
