// This branch deploys a standalone, default-closed beta Worker, never Pages files.
import {isConfigured, verifyBetaUser, deny} from './functions/_beta/auth.js';
import * as api from './functions/casey-beta/api.js';

const methods = {GET: api.onRequestGet, POST: api.onRequestPost,
  PATCH: api.onRequestPatch, DELETE: api.onRequestDelete};
const files = new Map([
  ['/casey-beta/', '/index.html'],
  ['/casey-beta/index.html', '/index.html'],
  ['/casey-beta/beta.js', '/beta.js'],
  ['/casey-beta/beta.css', '/beta.css']
]);
function privateResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {status: response.status, headers});
}
export default {
  async fetch(request, env) {
    // Guard the entire hostname, including alternate asset paths and APIs.
    if (!isConfigured(env)) return deny(503);
    if (!await verifyBetaUser(request, env)) return deny(403);
    try {
      const url = new URL(request.url);
      if (url.pathname === '/casey-beta/api') {
        const handler = methods[request.method];
        if (!handler) return privateResponse(new Response('Method not allowed', {status:405}));
        if (request.method !== 'GET' && request.headers.get('Origin') !== url.origin) return deny(403);
        return privateResponse(await handler({request, env}));
      }
      if (!['GET', 'HEAD'].includes(request.method)) return deny(405);
      if (url.pathname === '/' || url.pathname === '/casey-beta') {
        url.pathname = '/casey-beta/';
        return privateResponse(Response.redirect(url.toString(), 302));
      }
      const file = files.get(url.pathname);
      if (!file) return privateResponse(new Response('Not found', {status:404}));
      url.pathname = file;
      return privateResponse(await env.ASSETS.fetch(new Request(url, request)));
    } catch {
      return deny(503);
    }
  }
};
