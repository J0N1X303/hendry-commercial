// Cold Call Casey private preview API. Both methods pass through
// functions/_middleware.js Basic authentication on /casey/*.
// GET warms the SAME route as POST, without running the AI model,
// sending seller inputs, or consuming inference quota.
export { onRequestPost } from '../api/casey-prep.js';

export function onRequestGet({env}) {
  const connected=typeof env?.AI?.run==='function';
  return new Response(JSON.stringify({
    service:'casey-preparation',
    ready:connected
  }),{
    status:connected?200:503,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'private, no-store, max-age=0',
      'X-Robots-Tag':'noindex, nofollow, noarchive',
      'X-Content-Type-Options':'nosniff'
    }
  });
}
