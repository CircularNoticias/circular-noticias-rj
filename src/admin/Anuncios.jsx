import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseAds } from "../lib/supabaseAdsClient";

// ─── Projetos disponíveis para anúncios ────────────────────────────────────
// Lista de propósito único: pra adicionar um novo projeto seu no futuro,
// basta acrescentar um objeto aqui — o formulário se atualiza sozinho.
const PROJETOS_DISPONIVEIS = [
  { id: "circular", label: "Circular Notícias RJ" },
];

const REGIOES_DISPONIVEIS = [
  { id: "todos", label: "Todo o Estado" },
  { id: "metropolitana", label: "Região Metropolitana" },
  { id: "baixada", label: "Baixada Fluminense" },
  { id: "lagos", label: "Região dos Lagos" },
  { id: "serrana", label: "Região Serrana" },
  { id: "norte", label: "Norte Fluminense" },
  { id: "noroeste", label: "Noroeste Fluminense" },
  { id: "costa-verde", label: "Costa Verde" },
  { id: "medio-paraiba", label: "Médio Paraíba" },
  { id: "centro-sul", label: "Centro-Sul Fluminense" },
  { id: "geral", label: "Geral" },
];

// ─── Sessão (projeto de anúncios — separado do login do /admin do Circular) ─
function useAdsSession() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabaseAds.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabaseAds.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);
  return session;
}

export function RequireAdsAuth({ children }) {
  const session = useAdsSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session === null) navigate("/admin/anuncios/login");
  }, [session]);
  if (session === undefined) return <div style={{ padding: 40, textAlign: "center" }}>Carregando...</div>;
  if (!session) return null;
  return children;
}

// ─── Login ──────────────────────────────────────────────────────────────────
export function AdsLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabaseAds.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("E-mail ou senha inválidos.");
      return;
    }
    navigate("/admin/anuncios");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <form onSubmit={handleLogin} style={{ background: "#fff", padding: 32, borderRadius: 12, width: 320, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 18, color: "#1e293b" }}>Central de Anúncios — Login</h2>
        <input
          type="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
        />
        <input
          type="password"
          required
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
        />
        {error && <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 12px", fontWeight: 700, cursor: "pointer" }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

// ─── Estilos compartilhados do formulário ──────────────────────────────────
const inputStyle = { padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, width: "100%", boxSizing: "border-box" };
const labelStyle = { fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4, display: "block" };
const sectionStyle = { background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20, border: "1px solid #e2e8f0" };

// ─── Página principal ───────────────────────────────────────────────────────
export function AdminAnuncios() {
  const [anunciantes, setAnunciantes] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  // anunciante
  const [modoNovoAnunciante, setModoNovoAnunciante] = useState(false);
  const [anuncianteId, setAnuncianteId] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoContato, setNovoContato] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoEmail, setNovoEmail] = useState("");

  // campanha
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [urlDestino, setUrlDestino] = useState("");
  const [projetosSelecionados, setProjetosSelecionados] = useState(["circular"]);
  const [todosProjetos, setTodosProjetos] = useState(false);
  const [regioesSelecionadas, setRegioesSelecionadas] = useState([]);
  const [todasRegioes, setTodasRegioes] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [status, setStatus] = useState("ativa");
  const [prioridade, setPrioridade] = useState(1);

  const carregar = async () => {
    setLoading(true);
    const [{ data: a }, { data: c }] = await Promise.all([
      supabaseAds.rpc("listar_anunciantes"),
      supabaseAds.rpc("listar_campanhas"),
    ]);
    setAnunciantes(a || []);
    setCampanhas(c || []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const toggleRegiao = (id) => {
    setTodasRegioes(false);
    setRegioesSelecionadas((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const toggleProjeto = (id) => {
    setTodosProjetos(false);
    setProjetosSelecionados((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const limparFormularioCampanha = () => {
    setTitulo("");
    setDescricao("");
    setImagemUrl("");
    setUrlDestino("");
    setProjetosSelecionados(["circular"]);
    setTodosProjetos(false);
    setRegioesSelecionadas([]);
    setTodasRegioes(true);
    setDataInicio("");
    setDataFim("");
    setStatus("ativa");
    setPrioridade(1);
    setModoNovoAnunciante(false);
    setAnuncianteId("");
    setNovoNome("");
    setNovoContato("");
    setNovoTelefone("");
    setNovoEmail("");
  };

  const salvar = async (e) => {
    e.preventDefault();
    setMensagem(null);

    if (!titulo || !urlDestino || !dataInicio || !dataFim) {
      setMensagem({ tipo: "erro", texto: "Preencha título, URL de destino e as datas de início/fim." });
      return;
    }
    if (dataFim < dataInicio) {
      setMensagem({ tipo: "erro", texto: "A data de fim não pode ser antes da data de início." });
      return;
    }
    if (modoNovoAnunciante && !novoNome) {
      setMensagem({ tipo: "erro", texto: "Preencha o nome do novo anunciante." });
      return;
    }

    setSalvando(true);
    try {
      let anuncianteIdFinal = anuncianteId || null;

      if (modoNovoAnunciante) {
        const { data: novoAnunciante, error: erroAnunciante } = await supabaseAds.rpc("inserir_anunciante", {
          p_nome: novoNome,
          p_contato: novoContato || null,
          p_telefone: novoTelefone || null,
          p_email: novoEmail || null,
        });
        if (erroAnunciante) throw erroAnunciante;
        anuncianteIdFinal = novoAnunciante.id;
      }

      const projeto = todosProjetos ? ["todos"] : projetosSelecionados.length ? projetosSelecionados : ["circular"];
      const regioes = todasRegioes ? ["*"] : regioesSelecionadas.length ? regioesSelecionadas : ["*"];

      const { error: erroCampanha } = await supabaseAds.rpc("inserir_campanha", {
        p_titulo: titulo,
        p_url_destino: urlDestino,
        p_data_inicio: dataInicio,
        p_data_fim: dataFim,
        p_anunciante_id: anuncianteIdFinal,
        p_descricao: descricao || null,
        p_imagem_url: imagemUrl || null,
        p_projeto: projeto,
        p_regioes: regioes,
        p_status: status,
        p_prioridade: Number(prioridade) || 1,
      });
      if (erroCampanha) throw erroCampanha;

      setMensagem({ tipo: "ok", texto: "Campanha criada com sucesso!" });
      limparFormularioCampanha();
      carregar();
    } catch (err) {
      setMensagem({ tipo: "erro", texto: `Erro ao salvar: ${err.message || err}` });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter',system-ui,sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, color: "#1e293b", marginBottom: 20 }}>📢 Central de Anúncios</h1>

        <form onSubmit={salvar}>
          <div style={sectionStyle}>
            <h2 style={{ fontSize: 15, color: "#1e293b", marginTop: 0 }}>Anunciante</h2>
            {!modoNovoAnunciante ? (
              <>
                <label style={labelStyle}>Selecionar existente</label>
                <select value={anuncianteId} onChange={(e) => setAnuncianteId(e.target.value)} style={inputStyle}>
                  <option value="">— nenhum / não informado —</option>
                  {anunciantes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setModoNovoAnunciante(true)}
                  style={{ marginTop: 10, background: "none", border: "none", color: "#3b82f6", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 }}
                >
                  + Cadastrar novo anunciante
                </button>
              </>
            ) : (
              <>
                <label style={labelStyle}>Nome *</label>
                <input style={inputStyle} value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
                <label style={{ ...labelStyle, marginTop: 10 }}>Contato</label>
                <input style={inputStyle} value={novoContato} onChange={(e) => setNovoContato(e.target.value)} />
                <label style={{ ...labelStyle, marginTop: 10 }}>Telefone</label>
                <input style={inputStyle} value={novoTelefone} onChange={(e) => setNovoTelefone(e.target.value)} />
                <label style={{ ...labelStyle, marginTop: 10 }}>E-mail</label>
                <input style={inputStyle} value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />
                <button
                  type="button"
                  onClick={() => setModoNovoAnunciante(false)}
                  style={{ marginTop: 10, background: "none", border: "none", color: "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 }}
                >
                  ← usar anunciante existente
                </button>
              </>
            )}
          </div>

          <div style={sectionStyle}>
            <h2 style={{ fontSize: 15, color: "#1e293b", marginTop: 0 }}>Campanha</h2>

            <label style={labelStyle}>Título *</label>
            <input style={inputStyle} value={titulo} onChange={(e) => setTitulo(e.target.value)} />

            <label style={{ ...labelStyle, marginTop: 10 }}>Descrição</label>
            <input style={inputStyle} value={descricao} onChange={(e) => setDescricao(e.target.value)} />

            <label style={{ ...labelStyle, marginTop: 10 }}>Imagem (URL)</label>
            <input style={inputStyle} value={imagemUrl} onChange={(e) => setImagemUrl(e.target.value)} placeholder="https://..." />

            <label style={{ ...labelStyle, marginTop: 10 }}>URL de destino *</label>
            <input style={inputStyle} value={urlDestino} onChange={(e) => setUrlDestino(e.target.value)} placeholder="https://..." />

            <label style={{ ...labelStyle, marginTop: 14 }}>Projetos</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={todosProjetos}
                onChange={(e) => {
                  setTodosProjetos(e.target.checked);
                  if (e.target.checked) setProjetosSelecionados([]);
                }}
              />
              Todos os meus projetos
            </label>
            {PROJETOS_DISPONIVEIS.map((p) => (
              <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 4, opacity: todosProjetos ? 0.4 : 1 }}>
                <input type="checkbox" disabled={todosProjetos} checked={projetosSelecionados.includes(p.id)} onChange={() => toggleProjeto(p.id)} />
                {p.label}
              </label>
            ))}

            <label style={{ ...labelStyle, marginTop: 14 }}>Regiões</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={todasRegioes}
                onChange={(e) => {
                  setTodasRegioes(e.target.checked);
                  if (e.target.checked) setRegioesSelecionadas([]);
                }}
              />
              Todas as regiões
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", opacity: todasRegioes ? 0.4 : 1 }}>
              {REGIOES_DISPONIVEIS.map((r) => (
                <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <input type="checkbox" disabled={todasRegioes} checked={regioesSelecionadas.includes(r.id)} onChange={() => toggleRegiao(r.id)} />
                  {r.label}
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>
                  Início * <span style={{ fontWeight: 400, color: "#94a3b8" }}>(interno, não aparece no anúncio)</span>
                </label>
                <input type="date" style={inputStyle} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Fim *</label>
                <input type="date" style={inputStyle} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="ativa">Ativa</option>
                  <option value="pausada">Pausada</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Prioridade</label>
                <input type="number" min={1} style={inputStyle} value={prioridade} onChange={(e) => setPrioridade(e.target.value)} />
              </div>
            </div>
          </div>

          {mensagem && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 14,
                fontWeight: 600,
                background: mensagem.tipo === "ok" ? "#dcfce7" : "#fee2e2",
                color: mensagem.tipo === "ok" ? "#166534" : "#991b1b",
              }}
            >
              {mensagem.texto}
            </div>
          )}

          <button
            type="submit"
            disabled={salvando}
            style={{ width: "100%", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
          >
            {salvando ? "Salvando..." : "Criar campanha"}
          </button>
        </form>

        <h2 style={{ fontSize: 16, color: "#1e293b", marginTop: 32 }}>Campanhas cadastradas</h2>
        {loading ? (
          <p style={{ color: "#64748b" }}>Carregando...</p>
        ) : campanhas.length === 0 ? (
          <p style={{ color: "#64748b" }}>Nenhuma campanha cadastrada ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {campanhas.map((c) => (
              <div key={c.id} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: "1px solid #e2e8f0", fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 14, color: "#1e293b" }}>{c.titulo}</strong>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: c.status === "ativa" ? "#dcfce7" : "#f1f5f9",
                      color: c.status === "ativa" ? "#166534" : "#64748b",
                    }}
                  >
                    {c.status === "ativa" ? "Ativa" : "Pausada"}
                  </span>
                </div>
                <div style={{ color: "#64748b", marginTop: 4 }}>
                  {c.anunciante_nome ? `${c.anunciante_nome} · ` : ""}
                  {c.data_inicio} a {c.data_fim} · prioridade {c.prioridade}
                </div>
                <div style={{ color: "#94a3b8", marginTop: 2 }}>
                  projetos: {(c.projeto || []).join(", ")} · regiões: {(c.regioes || []).join(", ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
    
