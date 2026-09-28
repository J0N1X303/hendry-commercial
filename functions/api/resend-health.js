function json(data,status=200){
  return new Response(JSON.stringify(data,null,2),{
    status,
    headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}

export async function onRequestGet(context){
  const key=context.env.RESEND_API_KEY;
  const hasKey=!!key;
  const keyLooksRight=hasKey && String(key).startsWith("re_");
  return json({
    ok:true,
    endpoint:"resend-health",
    deployed_at:"2026-09-28T10:08:00+01:00",
    has_resend_api_key:hasKey,
    resend_api_key_prefix:key ? String(key).slice(0,3) : null,
    resend_api_key_looks_right:keyLooksRight,
    note: hasKey ? "Cloudflare can see RESEND_API_KEY." : "Cloudflare cannot see RESEND_API_KEY in this environment."
  });
}
