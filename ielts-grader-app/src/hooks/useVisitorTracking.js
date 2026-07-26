import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { captureFirstTouch, getAttributionPayload } from '../utils/attribution';

export function useVisitorTracking() {
  const location = useLocation();
  const lastPathRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    captureFirstTouch();
  }, []);

  useEffect(() => {
    // Skip analytics noise during Puppeteer prerender builds
    if (typeof navigator !== 'undefined' && navigator.webdriver) return;

    const path = location.pathname;
    if (path === lastPathRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      lastPathRef.current = path;
      const payload = getAttributionPayload(path);
      api.trackPageView(payload).catch(() => {});
    }, 100);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname]);
}
