// Non-sensitive private preview status; protected by functions/_middleware.js.
export function onRequestGet({env}) {
  const connected = typeof env?.AI?.run === "function";
  return new Response(JSON.stringify({
    preview: "casey-v3",
    ai_binding: connected ? "connected" : "missing"
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}
