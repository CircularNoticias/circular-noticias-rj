import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// ─── Sessão ──────────────────────────────────────────────────────────────
function useAdminSession() {
  const [session, setSession] = useState(undefined); // undefined = carregando
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);
  return session;
}

export function RequireAuth({ children }) {
  const session = useAdminSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session === null) navigate("/admin/login");
  }, [session]);
  if (session === undefined) return <div style={{ padding: 40, textAlign: "center" }}>Carregando...</div>;
  if (!session) return null;
  return children;
}

// ─── Login ───────────────────────────────────────────────────────────────
export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError("E-mail ou senha inválidos."); return; }
    navigate("/admin");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <form onSubmit={handleLogin} style={{ background: "#fff", padding: 32, borderRadius: 12, width: 320, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 18, color: "#1e293b" }}>Circular Notícias RJ — Admin</h2>
        <input type="email" required placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }} />
        <input type="password" required placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }} />
        {error && <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>}
        <button type="submit" disabled={loading}
          style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 12px", fontWeight: 700, cursor: "pointer" }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────
const STATUS_COLORS = { ok: "#22c55e", erro_fetch: "#ef4444", sem_suporte: "#94a3b8" };

export function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saude, setSaude] = useState([]);
  const [alertas, setAlertas] = useState([]);

  const carregar = async () => {
    setLoading(true);
    const [{ data: fontesAtivas }, { data: saudeData }, { data: alertasData }] = await Promise.all([
      supabase.from("fontes").select("id").eq("ativo", true),
      supabase.from("fontes_saude").select("fonte_id,fonte_nome,status,itens_inseridos,tempo_resposta_ms,id").order("id", { ascending: false }).limit(500),
      supabase.from("alertas_fontes").select("*").eq("resolvido", false).order("criado_em", { ascending: false }),
    ]);
    const idsAtivos = new Set((fontesAtivas || []).map(f => f.id));
    // Mantém só o registro mais recente de cada fonte (a query já vem
    // ordenada da mais nova pra mais antiga).
    const vistos = new Set();
    const ultimas = [];
    for (const row of saudeData || []) {
      if (vistos.has(row.fonte_id)) continue;
      if (!idsAtivos.has(row.fonte_id)) continue;
      vistos.add(row.fonte_id);
      ultimas.push(row);
    }
    setSaude(ultimas);
    setAlertas((alertasData || []).filter(a => idsAtivos.has(a.fonte_id)));
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const logout = async () => { await supabase.auth.signOut(); navigate("/admin/login"); };

  const totalOk = saude.filter(s => s.status === "ok").length;
  const totalErro = saude.filter(s => s.status === "erro_fetch").length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 20, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <h1 style={{ fontSize: 20, color: "#1e293b", margin: 0 }}>Centro de Inteligência — Circular Notícias RJ</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={carregar} style={{ background: "#e2e8f0", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}>Atualizar</button>
            <button onClick={logout} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}>Sair</button>
          </div>
        </div>

        {loading ? <p>Carregando...</p> : (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>Fontes saudáveis</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#22c55e" }}>{totalOk}</div>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>Com falha (última execução)</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#ef4444" }}>{totalErro}</div>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>Alertas ativos (3+ falhas)</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#f97316" }}>{alertas.length}</div>
              </div>
            </div>

            {alertas.length > 0 && (
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#9a3412" }}>🚨 Fontes com falhas consecutivas</h3>
                {alertas.map(a => (
                  <div key={a.id} style={{ fontSize: 13, color: "#7c2d12", padding: "4px 0" }}>
                    {a.fonte_nome} — {a.falhas_consecutivas} falhas desde {new Date(a.criado_em).toLocaleString("pt-BR")}
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "10px 14px" }}>Fonte</th>
                    <th style={{ padding: "10px 14px" }}>Status</th>
                    <th style={{ padding: "10px 14px" }}>Itens inseridos</th>
                    <th style={{ padding: "10px 14px" }}>Tempo (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {saude.map(s => (
                    <tr key={s.fonte_id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 14px" }}>{s.fonte_nome}</td>
                      <td style={{ padding: "8px 14px" }}>
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[s.status] || "#94a3b8", marginRight: 6 }} />
                        {s.status}
                      </td>
                      <td style={{ padding: "8px 14px" }}>{s.itens_inseridos ?? "-"}</td>
                      <td style={{ padding: "8px 14px" }}>{s.tempo_resposta_ms ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
