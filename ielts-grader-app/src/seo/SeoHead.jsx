import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://ieltsgrader.com';

export default function SeoHead({
  title,
  description,
  path = '',
  type = 'website',
  noindex = false,
  jsonLd = null,
}) {
  const url = `${SITE_URL}${path}`;
  const fullTitle = title?.includes('IELTSGRADER') || title?.includes('IELTS AI Tutor')
    ? title
    : `${title} | IELTS AI Tutor`;

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

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) && jsonLd.length > 1 ? jsonLd : (Array.isArray(jsonLd) ? jsonLd[0] : jsonLd))}
        </script>
      )}
    </Helmet>
  );
}
