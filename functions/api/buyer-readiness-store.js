function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}

function clean(value,max=5000){
  return String(value??"").replace(/\0/g,"").trim().slice(0,max);
}
function validEmail(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||""));
}
function safeUrl(value){
  try{
    const u=new URL(String(value||""));
    return ["http:","https:"].includes(u.protocol) ? u.href : "";
  }catch{return "";}
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

export async function onRequestPost(context){
  const db=context.env.BUYER_READINESS_DB;
  if(!db) return json({success:false,message:"Lead inbox is not configured."},503);

  const length=Number(context.request.headers.get("content-length")||0);
  if(length>100000) return json({success:false,message:"Payload too large."},413);

  try{
    const body=await context.request.json();
    const leadId=clean(body?.lead_id,120);
    const createdAt=clean(body?.created_at,80)||new Date().toISOString();
    const updatedAt=clean(body?.updated_at,80)||new Date().toISOString();
    const status=["snapshot","qualified"].includes(clean(body?.status,30)) ? clean(body.status,30) : "snapshot";
    const contact=body?.contact&&typeof body.contact==="object" ? body.contact : {};
    const business=body?.business&&typeof body.business==="object" ? body.business : {};
    const email=clean(contact.email,320);
    const website=safeUrl(business.website);
    const businessName=clean(business.name,240) || (website ? new URL(website).hostname.replace(/^www\./,"") : "");

    if(!leadId || !website || !businessName || (email && !validEmail(email))){
      return json({success:false,message:"Invalid lead payload."},400);
    }

    const canonical={
      schema_version:"buyer-readiness-lead-1",
      lead_id:leadId,
      created_at:createdAt,
      updated_at:updatedAt,
      source:"hendrycommercial_check",
      status,
      contact:{
        name:clean(contact.name,160),
        email
      },
      business:{
        name:businessName,
        website,
        domain:clean(business.domain,240),
        description:clean(business.description,1800)
      },
      snapshot: body?.snapshot&&typeof body.snapshot==="object" ? body.snapshot : {},
      commercial_context: body?.commercial_context&&typeof body.commercial_context==="object" ? body.commercial_context : {}
    };

    await ensureSchema(db);
    await db.prepare(`
      INSERT INTO buyer_readiness_leads(
        lead_id,created_at,updated_at,status,business_name,website,contact_name,contact_email,payload_json
      ) VALUES(?,?,?,?,?,?,?,?,?)
      ON CONFLICT(lead_id) DO UPDATE SET
        updated_at=excluded.updated_at,
        status=excluded.status,
        business_name=excluded.business_name,
        website=excluded.website,
        contact_name=excluded.contact_name,
        contact_email=excluded.contact_email,
        payload_json=excluded.payload_json
    `).bind(
      canonical.lead_id,
      canonical.created_at,
      canonical.updated_at,
      canonical.status,
      canonical.business.name,
      canonical.business.website,
      canonical.contact.name,
      canonical.contact.email,
      JSON.stringify(canonical)
    ).run();

    return json({success:true,lead_id:canonical.lead_id,status:canonical.status});
  }catch(e){
    return json({success:false,message:"Lead could not be stored."},500);
  }
}

export function onRequest(){
  return json({success:false,message:"Method not allowed."},405);
}
