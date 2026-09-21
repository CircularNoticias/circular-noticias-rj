import { Helmet } from 'react-helmet-async';

const SITE_NAME = "Circular Notícias RJ";
const SITE_URL = "https://circularnoticias.com.br";
const DEFAULT_DESCRIPTION = "Circular Notícias RJ — Tudo o que acontece no Estado do Rio de Janeiro, em um só lugar.";

export default function Seo({ title, description, path = "" }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const desc = description || DEFAULT_DESCRIPTION;
  const url = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </Helmet>
  );
}
