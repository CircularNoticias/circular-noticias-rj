// api/proxy-imagem.js
//
// Proxy leve de imagens. Em vez do navegador do visitante carregar a imagem
// direto do domínio da fonte (o que hoje falha seletivamente por bloqueio de
// hotlink, CDN/antirobô, ou porque a URL não é mais uma imagem de verdade),
// este endpoint busca a imagem NO SERVIDOR — com Referer e User-Agent de
// navegador real — e repassa os bytes sob o próprio domínio do Circular.
//
// Isso resolve o caso mais comum de falha (bloqueio simples por Referer,
// onde o CDN da fonte só libera a imagem pra quem "veio" do próprio site).
// NÃO resolve: URL assinada/expirada, bloqueio por IP de datacenter, ou
// desafio antirobô real (captcha/JS challenge) — esses exigem cache
// permanente com download prévio, que é um projeto maior e fica pra depois
// se este primeiro passo não for suficiente.
//
// Uso: <img src="/api/proxy-imagem?url=https://fonte.com/foto.jpg">
//
// Segurança: como este endpoint é público (chamado direto pelo navegador do
// visitante), ele precisa validar a URL antes de buscar, pra não virar um proxy
// aberto capaz de acessar endereços internos (SSRF). Ver ehostnameBloqueado().
//
// Em caso de falha (bloqueio, timeout, não é imagem, arquivo grande demais),
// responde com erro HTTP — o <img onError> do NewsCard já esconde a imagem
// nesse caso, caindo no card só-texto que já existe hoje. Nenhum comportamento
// novo pro visitante em caso de falha; só ganha chance de funcionar em mais casos.

import dns from "node:dns";

const TIMEOUT_MS = 8000;             // Vercel Hobby: margem segura antes do limite da function
const MAX_BYTES = 6 * 1024 * 1024;   // 6MB — imagem de card de notícia nunca precisa disso
const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function ipv4ParaNumero(ip) {
  const partes = ip.split(".").map(Number);
  if (partes.length !== 4 || partes.some(n => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return ((partes[0] << 24) | (partes[1] << 16) | (partes[2] << 8) | partes[3]) >>> 0;
}

function faixaIpv4(cidr) {
  const [base, bits] = cidr.split("/");
  const baseNum = ipv4ParaNumero(base);
  const mascara = bits === "32" ? 0xffffffff : (~0 << (32 - Number(bits))) >>> 0;
  return { baseNum, mascara };
}

// Faixas privadas/reservadas — cobre redes internas, loopback, link-local
// (inclui o endereço de metadados de nuvem 169.254.169.254) e afins.
const FAIXAS_PRIVADAS_V4 = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
  "172.16.0.0/12", "192.0.0.0/24", "192.168.0.0/16", "198.18.0.0/15", "224.0.0.0/4",
].map(faixaIpv4);

function ipv4EhPrivado(ip) {
  const num = ipv4ParaNumero(ip);
  if (num === null) return false;
  return FAIXAS_PRIVADAS_V4.some(({ baseNum, mascara }) => (num & mascara) === (baseNum & mascara));
}

function ipv6EhPrivado(ip) {
  const normalizado = ip.toLowerCase();
  return (
    normalizado === "::1" ||               // loopback
    normalizado.startsWith("::ffff:") ||   // IPv4-mapped — reavalia como IPv4 abaixo
    normalizado.startsWith("fc") || normalizado.startsWith("fd") || // unique local (fc00::/7)
    normalizado.startsWith("fe80")         // link-local
  );
}

function enderecoEhPrivado(ip, familia) {
  if (familia === 4) return ipv4EhPrivado(ip);
  if (ip.toLowerCase().startsWith("::ffff:")) return ipv4EhPrivado(ip.split(":").pop());
  return ipv6EhPrivado(ip);
}

// Resolve o domínio de verdade (não só olha a URL escrita) e recusa se o IP
// resultante for de rede interna. Isso cobre tanto quem tenta usar um IP
// literal quanto um domínio que aponta (de propósito ou não) pra dentro da
// rede da própria Vercel.
function resolverEValidarHost(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true, verbatim: true }, (err, enderecos) => {
      if (err) return reject(new Error("Não foi possível resolver o domínio da imagem"));
      const algumPrivado = enderecos.some(({ address, family }) => enderecoEhPrivado(address, family));
      if (algumPrivado) return reject(new Error("Domínio recusado por segurança"));
      resolve();
    });
  });
}

function validarUrlDeEntrada(valor) {
  if (!valor || typeof valor !== "string") throw new Error("Parâmetro 'url' ausente");
  let url;
  try {
    url = new URL(valor);
  } catch {
    throw new Error("URL inválida");
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Apenas http/https são permitidos");
  if (!url.hostname || url.hostname === "localhost") throw new Error("Host não permitido");
  return url;
}

function aplicarCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
}

export default async function handler(req, res) {
  aplicarCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    return res.status(405).json({ error: "Método não permitido. Use GET." });
  }

  let urlAlvo;
  try {
    urlAlvo = validarUrlDeEntrada(req.query?.url);
    await resolverEValidarHost(urlAlvo.hostname);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const origem = await fetch(urlAlvo.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        // Referer do próprio domínio da imagem — é exatamente o que falta
        // quando o navegador do visitante carrega direto de outro domínio,
        // e o que resolve o bloqueio simples de hotlink por Referer.
        Referer: `${urlAlvo.protocol}//${urlAlvo.hostname}/`,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!origem.ok) {
      return res.status(502).json({ error: `Fonte recusou a imagem (HTTP ${origem.status})` });
    }

    const contentType = origem.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      // A URL não entrega uma imagem de verdade (HTML de erro, redirecionamento
      // pra página de bloqueio, etc.) — não faz sentido repassar isso como se
      // fosse imagem.
      return res.status(415).json({ error: `Conteúdo não é imagem (Content-Type: ${contentType || "ausente"})` });
    }

    const tamanhoDeclarado = Number(origem.headers.get("content-length") || 0);
    if (tamanhoDeclarado > MAX_BYTES) {
      return res.status(413).json({ error: "Imagem excede o tamanho máximo permitido" });
    }

    const bytes = Buffer.from(await origem.arrayBuffer());
    if (bytes.length > MAX_BYTES) {
      return res.status(413).json({ error: "Imagem excede o tamanho máximo permitido" });
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", CACHE_CONTROL);
    res.setHeader("Content-Length", String(bytes.length));
    return res.status(200).send(bytes);
  } catch (err) {
    const timedOut = err.name === "AbortError";
    console.error("[proxy-imagem] erro:", urlAlvo.toString(), err.message);
    return res.status(502).json({ error: timedOut ? "Tempo esgotado ao buscar a imagem" : "Falha ao buscar a imagem" });
  } finally {
    clearTimeout(timeout);
  }
}
