function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}
async function ensureSchema(db){
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS buyer_readiness_leads (
      lead_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL,
      business_name TEXT NOT NULL,
      website TEXT NOT NULL,
      contact_name TEXT NOT NULL DEFAULT '',
      contact_email TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    )
  `).run();
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_buyer_readiness_leads_updated
    ON buyer_readiness_leads(updated_at DESC)
  `).run();
}
function authorised(request,env){
  const expected=String(env.BUYER_READINESS_SYNC_KEY||"");
  const auth=request.headers.get("authorization")||"";
  return !!expected && auth===`Bearer ${expected}`;
}

export async function onRequestGet(context){
  if(!authorised(context.request,context.env)) return json({error:"unauthorised"},401);
  const db=context.env.BUYER_READINESS_DB;
  if(!db) return json({error:"Lead inbox is not configured."},503);
  await ensureSchema(db);

  const url=new URL(context.request.url);
  const since=url.searchParams.get("since")||"";
  const qualifiedOnly=url.searchParams.get("qualified")==="1";
  const limit=Math.min(Math.max(Number(url.searchParams.get("limit")||100),1),250);

  let sql="SELECT payload_json FROM buyer_readiness_leads WHERE 1=1";
  const binds=[];
  if(since){ sql+=" AND updated_at > ?"; binds.push(since); }
  if(qualifiedOnly){ sql+=" AND status = 'qualified'"; }
  sql+=" ORDER BY updated_at DESC LIMIT ?";
  binds.push(limit);

  const stmt=db.prepare(sql).bind(...binds);
  const result=await stmt.all();
  const leads=[];
  for(const row of result.results||[]){
    try{leads.push(JSON.parse(row.payload_json));}catch{}
  }
  return json({leads,count:leads.length});
}

export function onRequest(){
  return json({error:"Method not allowed."},405);
}
