import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://ieltsgrader.com';
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export default function SeoHead({
  title,
  description,
  path = '',
  type = 'website',
  noindex = false,
  jsonLd = null,
  image = OG_IMAGE,
}) {
  const url = `${SITE_URL}${path}`;
  const fullTitle = title?.includes('IELTSGRADER') || title?.includes('IELTS AI Tutor')
    ? title
    : `${title} | IELTS AI Tutor`;

  const ldPayload = Array.isArray(jsonLd)
    ? (jsonLd.length === 1 ? jsonLd[0] : { '@context': 'https://schema.org', '@graph': jsonLd.map((item) => {
        const { '@context': _c, ...rest } = item || {};
        return rest;
      }) })
    : jsonLd;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:site_name" content="IELTS AI Tutor by IELTSGRADER" />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />

      {ldPayload && (
        <script type="application/ld+json">
          {JSON.stringify(ldPayload)}
        </script>
      )}
    </Helmet>
  );
}
