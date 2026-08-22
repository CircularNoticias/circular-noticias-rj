const IGNORE_IMAGE_PATTERNS = [
  /logo/i,
  /banner/i,
  /icon/i,
  /sprite/i,
  /avatar/i,
  /placeholder/i,
  /ads?[-_.]/i,
  /publicidade/i,
  /pixel/i,
  /tracking/i,
];

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function resolveImageUrl(value, baseUrl) {
  const raw = decodeHtml(String(value || "")).trim();
  if (!raw || raw.startsWith("data:") || /^javascript:/i.test(raw)) return null;
  try {
    const resolved = new URL(raw, baseUrl || undefined).toString();
    return /^https?:\/\//i.test(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

export function isImageUrlValid(value) {
  if (!value || typeof value !== "string" || !/^https?:\/\//i.test(value)) return false;
  if (/\.svg(?:[?#]|$)/i.test(value)) return false;
  return !IGNORE_IMAGE_PATTERNS.some(pattern => pattern.test(value));
}

function firstValue(value) {
  if (Array.isArray(value)) return value.find(Boolean);
  return value;
}

function imageValue(value) {
  const item = firstValue(value);
  if (!item) return null;
  if (typeof item === "string") return item;
  return item["@_url"] || item["@_href"] || item.url || item.href || item.src || item["#text"] || null;
}

export function extractImageFromRssItem(item, baseUrl) {
  const candidates = [
    imageValue(item?.enclosure),
    imageValue(item?.["media:content"]),
    imageValue(item?.["media:thumbnail"]),
    imageValue(item?.["media:group"]?.["media:content"]),
    imageValue(item?.image),
  ];
  for (const candidate of candidates) {
    const resolved = resolveImageUrl(candidate, baseUrl);
    if (isImageUrlValid(resolved)) return resolved;
  }
  const html = item?.["content:encoded"] || item?.description || "";
  return extractImageFromHtml(String(html), baseUrl);
}

function metaContent(html, names) {
  const wanted = names.map(name => name.toLowerCase());
  const tags = [...String(html || "").matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]);
  for (const tag of tags) {
    const key = (tag.match(/\b(?:property|name)=['"]([^'"]+)['"]/i) || [])[1]?.toLowerCase();
    const content = (tag.match(/\bcontent=['"]([^'"]*)['"]/i) || [])[1];
    if (key && content && wanted.includes(key)) return content;
  }
  return null;
}

function srcsetCandidate(value) {
  return String(value || "")
    .split(",")
    .map(part => {
      const [url, descriptor] = part.trim().split(/\s+/);
      const width = descriptor?.endsWith("w") ? Number.parseInt(descriptor, 10) : 0;
      return { url, width: Number.isFinite(width) ? width : 0 };
    })
    .filter(item => item.url)
    .sort((a, b) => b.width - a.width)[0]?.url || null;
}

function jsonLdImages(value, found = []) {
  if (!value || found.length) return found;
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) jsonLdImages(item, found);
    return found;
  }
  if (typeof value === "object") {
    for (const key of ["image", "thumbnailUrl", "contentUrl", "url"]) {
      if (value[key]) jsonLdImages(value[key], found);
      if (found.length) return found;
    }
    for (const child of Object.values(value)) jsonLdImages(child, found);
  }
  return found;
}

function extractJsonLdImage(html) {
  const scripts = [...String(html || "").matchAll(/<script\b[^>]*type=['"]application\/ld\+json['"][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1].trim().replace(/<!--|-->/g, ""));
      const candidate = jsonLdImages(parsed)[0];
      if (candidate) return candidate;
    } catch {
      // Alguns portais publicam JSON-LD com vírgula extra; as outras heurísticas continuam válidas.
    }
  }
  return null;
}

export function extractImageFromHtml(html, baseUrl) {
  const candidates = [
    metaContent(html, ["og:image", "og:image:url", "og:image:secure_url"]),
    metaContent(html, ["twitter:image", "twitter:image:src"]),
    extractJsonLdImage(html),
  ];
  for (const candidate of candidates) {
    const resolved = resolveImageUrl(candidate, baseUrl);
    if (isImageUrlValid(resolved)) return resolved;
  }

  const tags = [...String(html || "").matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);
  for (const tag of tags) {
    const src = (tag.match(/\b(?:src|data-src|data-lazy-src|data-original)=['"]([^'"]+)['"]/i) || [])[1];
    const srcset = (tag.match(/\b(?:srcset|data-srcset)=['"]([^'"]+)['"]/i) || [])[1];
    const candidate = src || srcsetCandidate(srcset);
    const resolved = resolveImageUrl(candidate, baseUrl);
    if (!isImageUrlValid(resolved)) continue;
    if (IGNORE_IMAGE_PATTERNS.some(pattern => pattern.test(resolved))) continue;
    const width = Number.parseInt((tag.match(/\bwidth=['"]?(\d+)/i) || [])[1] || "0", 10);
    const height = Number.parseInt((tag.match(/\bheight=['"]?(\d+)/i) || [])[1] || "0", 10);
    if (width && width < 250) continue;
    if (height && height < 150) continue;
    return resolved;
  }
  return null;
}
    
