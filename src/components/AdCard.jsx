// AdCard — busca a campanha real via Supabase de publicidade (buscar_campanhas)
// e renderiza um card visualmente consistente com o feed, identificado como
// publicidade. Quando a campanha tem imagem, ela ocupa o card inteiro
// (edge-to-edge). Sem campanha ativa, não renderiza nada.

import { useState, useEffect } from "react";
import { buscarCampanha, registrarEvento } from "../lib/supabaseAdsClient.js";

export default function AdCard({ regiao = "*" }) {
  const [campanha, setCampanha] = useState(undefined);

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

  const cardBase = {
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
    overflow: "hidden",
    cursor: "pointer",
    border: "1px solid #f1f5f9",
    position: "relative",
  };

  const selo = (
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
        zIndex: 1,
      }}
    >
      PUBLICIDADE
    </span>
  );

  // Card com imagem: a imagem preenche o card inteiro (edge-to-edge)
  if (campanha.imagem_url) {
    return (
      <div
        onClick={abrir}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && abrir()}
        style={{ ...cardBase, aspectRatio: "16 / 10" }}
      >
        <img
          src={campanha.imagem_url}
          alt={campanha.titulo}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {selo}
      </div>
    );
  }

  // Fallback sem imagem: mantém o layout com título e CTA
  return (
    <div
      onClick={abrir}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && abrir()}
      style={{ ...cardBase, display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          width: "100%",
          height: 140,
          background: "linear-gradient(135deg,#fef3c7,#fde68a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <span style={{ fontSize: 32 }}>📣</span>
        {selo}
      </div>
      <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e293b", lineHeight: 1.35 }}>
          {campanha.titulo}
        </h3>
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
