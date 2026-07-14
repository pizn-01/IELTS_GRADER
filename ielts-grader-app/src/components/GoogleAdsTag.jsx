import { useEffect } from 'react';

const GOOGLE_ADS_ID = 'AW-18322992043';

/**
 * Loads the Google Ads gtag on mount only.
 * Mount from dashboard (or other pages you want to track) — not site-wide.
 */
export default function GoogleAdsTag() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
    }

    const scriptSrc = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
    const alreadyLoaded = document.querySelector(`script[src="${scriptSrc}"]`);

    if (!alreadyLoaded) {
      const script = document.createElement('script');
      script.async = true;
      script.src = scriptSrc;
      document.head.appendChild(script);
    }

    window.gtag('js', new Date());
    window.gtag('config', GOOGLE_ADS_ID);
  }, []);

  return null;
}
