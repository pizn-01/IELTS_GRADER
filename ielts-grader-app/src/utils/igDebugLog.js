/** Debug-session logger — ingest + same-origin API (works on local; API works on prod→Fly). */
const INGEST =
  'http://127.0.0.1:7565/ingest/ccf50587-967c-4a8a-a2fe-8c502b556896';
const SESSION = '5c9f04';

export function igDebugLog({
  hypothesisId,
  location,
  message,
  data,
  runId = 'post-fix',
}) {
  const body = {
    sessionId: SESSION,
    runId,
    hypothesisId,
    location,
    message,
    data: data || {},
    timestamp: Date.now(),
  };
  // #region agent log
  try {
    console.info('[ig-debug]', location, message, data || {});
  } catch (_) {}
  fetch(INGEST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': SESSION,
    },
    body: JSON.stringify(body),
  }).catch(() => {});
  fetch('/api/debug/agent-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
  // #endregion
}
