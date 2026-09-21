import { Helmet } from 'react-helmet-async';

const SITE_NAME = "Circular Notícias RJ";
const SITE_URL = "https://www.circularnoticias.com.br";
const DEFAULT_DESCRIPTION = "Circular Notícias RJ — Tudo o que acontece no Estado do Rio de Janeiro, em um só lugar.";

// Única camada responsável pelo SEO do <head>: title, meta description,
// canonical, Open Graph, Twitter e JSON-LD (WebSite + BreadcrumbList).
// titleIsFull=true quando `title` já vem pronto (com o nome do site
// embutido); caso contrário, "Circular Notícias RJ" é anexado ao final.
export default function Seo({
  title,
  titleIsFull = false,
  description,
  path = "",
  noIndex = false,
  breadcrumbItems,
}) {
  const fullTitle = title
    ? (titleIsFull ? title : `${title} | ${SITE_NAME}`)
    : SITE_NAME;
  const desc = description || DEFAULT_DESCRIPTION;
  const url = `${SITE_URL}${path}`;

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_NAME,
    "url": `${SITE_URL}/`,
  };

  const breadcrumbLd = breadcrumbItems && breadcrumbItems.length
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbItems.map((item, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": item.name,
          ...(item.url ? { item: item.url } : {}),
        })),
      }
    : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, follow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <script type="application/ld+json">{JSON.stringify(websiteLd)}</script>
      {breadcrumbLd && (
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      )}
    </Helmet>
  );
}
