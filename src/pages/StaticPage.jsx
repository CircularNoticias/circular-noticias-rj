import { Link } from "react-router-dom";
import { Logo } from "../components/Logo.jsx";

const FOOTER_LINKS = [
  { to: "/quem-somos", label: "Quem Somos" },
  { to: "/publicidade", label: "Publicidade" },
  { to: "/divulgue-sua-empresa", label: "Divulgue sua Empresa" },
  { to: "/termos-de-uso", label: "Termos de Uso" },
  { to: "/privacidade", label: "Privacidade" },
  { to: "/contato", label: "Contato" },
];

export default function StaticPage({ title, children }) {
  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)", padding: "0 16px", boxShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, paddingBottom: 14 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <Logo size={38} />
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, letterSpacing: 1, lineHeight: 1 }}>CIRCULAR</div>
              <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: 10, letterSpacing: 3 }}>NOTÍCIAS RJ</div>
            </div>
          </Link>
          <Link to="/" style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            ← Voltar às notícias
          </Link>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 760, margin: "0 auto", padding: "32px 20px 48px", width: "100%", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1e293b", marginBottom: 24, letterSpacing: -0.4 }}>
          {title}
        </h1>
        <div
          style={{ fontSize: 15, color: "#334155", lineHeight: 1.75 }}
          className="static-page-content"
        >
          {children}
        </div>
      </main>

      <footer style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)", marginTop: 16, padding: "36px 20px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Logo size={38} />
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 17, letterSpacing: 1 }}>CIRCULAR</div>
              <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: 10, letterSpacing: 3 }}>NOTÍCIAS RJ</div>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
            Tudo o que acontece no Estado do Rio de Janeiro, em um só lugar.
          </p>

          <nav style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 14px", margin: "4px 0" }}>
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.1)" }} />

          <div style={{ fontSize: 13, color: "#64748b" }}>
            Contato:{" "}
            <a href="mailto:circularnoticias@gmail.com" style={{ color: "#38bdf8", fontWeight: 600, textDecoration: "none" }}>
              circularnoticias@gmail.com
            </a>
          </div>

          <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
            Centro Inteligente de Notícias do Estado do Rio de Janeiro.
          </p>

          <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>
            © 2026 Circular Notícias RJ – Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
