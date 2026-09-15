// AdCard — busca a campanha real via Supabase de publicidade (buscar_campanhas)
// e renderiza um card visualmente consistente com o NewsCard, identificado
// como publicidade. Se não houver campanha ativa para a região, não
// renderiza nada (o feed volta a ser só notícias, sem buraco nem placeholder).

import { useState, useEffect } from "react";
import { buscarCampanha, registrarEvento } from "../lib/supabaseAdsClient.js";

export default function AdCard({ regiao = "*" }) {
  const [campanha, setCampanha] = useState(undefined); // undefined = carregando

  useEffect(() => {
    let mounted = true;
    buscarCampanha(regiao).then((c) => {
      if (mounted) setCampanha(c);
    });
    return () => {
      mounted = false;
    };
  }, [regiao]);

  useEffect(() => {
    if (campanha) registrarEvento(campanha.id, "impressao", regiao);
  }, [campanha]);

  if (campanha === undefined) return null;
  if (campanha === null) return null;

  const abrir = () => {
    registrarEvento(campanha.id, "clique", regiao);
    if (!campanha.url_destino) return;
    if (campanha.url_destino.startsWith("/")) {
      window.location.href = campanha.url_destino;
    } else {
      window.open(campanha.url_destino, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      onClick={abrir}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && abrir()}
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #f1f5f9",
        position: "relative",
      }}
    >
      {campanha.imagem_url ? (
        <div style={{ width: "100%", height: 220, position: "relative", background: "#e2e8f0", flexShrink: 0 }}>
          <img
            src={campanha.imagem_url}
            alt={campanha.titulo}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div style={{ position: "absolute", bottom: 0, left: 0, height: 4, width: "100%", background: "#f59e0b" }} />
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            height: 140,
            background: "linear-gradient(135deg,#fef3c7,#fde68a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 32 }}>📣</span>
        </div>
      )}

      <span
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.5,
          padding: "2px 8px",
          borderRadius: 8,
        }}
      >
        PUBLICIDADE
      </span>

      <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e293b", lineHeight: 1.35 }}>
          {campanha.titulo}
        </h3>
        {campanha.descricao && (
          <div style={{ background: "#fffbeb", borderRadius: 8, padding: "10px 12px" }}>
            <p style={{ margin: 0, fontSize: 14, color: "#78350f", lineHeight: 1.5 }}>{campanha.descricao}</p>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Publicidade</span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              fontWeight: 700,
              color: "#b45309",
              background: "#fef3c7",
              padding: "4px 12px",
              borderRadius: 20,
            }}
          >
            Saiba mais →
          </span>
        </div>
      </div>
    </div>
  );
}
