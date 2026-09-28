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

function escapeHtml(value){
  return clean(value,20000).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
}

function textBlock(value){ return escapeHtml(value).replace(/\n/g,"<br>"); }

function snapshotParts(body){
  const business=clean(body?.business_name,180) || clean(body?.domain,180) || "your business";
  const website=clean(body?.website,500);
  const strengthTitle=clean(body?.strength_title,500);
  const strengthBody=clean(body?.strength_body,1200);
  const opportunities=Array.isArray(body?.opportunities) ? body.opportunities.map((x,i)=>({
    number:i+1,
    title:clean(x?.title,500),
    body:clean(x?.observation || x?.body,1200)
  })).filter(x=>x.title||x.body) : [];
  const searches=Array.isArray(body?.buyer_search_examples) ? body.buyer_search_examples.slice(0,8).map(x=>clean(x,200)).filter(Boolean) : [];
  const summary=clean(body?.snapshot_summary,15000);
  return {business,website,strengthTitle,strengthBody,opportunities,searches,summary};
}

function emailShell({preheader,heading,intro,bodyHtml,footer}){
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
  <body style="margin:0;background:#08110c;color:#f3f4ef;font-family:Inter,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#08110c;padding:28px 14px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#101a13;border:1px solid #26362c;border-radius:20px;overflow:hidden;">
          <tr><td style="padding:34px 32px 22px;">
            <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#63d995;font-weight:800;margin-bottom:18px;">Hendry Commercial</div>
            <h1 style="margin:0;color:#f3f4ef;font-size:36px;line-height:1.05;letter-spacing:-.04em;font-family:Arial,sans-serif;">${escapeHtml(heading)}</h1>
            <p style="color:#b8c5bc;font-size:16px;line-height:1.6;margin:20px 0 0;">${escapeHtml(intro)}</p>
          </td></tr>
          <tr><td style="padding:0 32px 32px;">${bodyHtml}</td></tr>
          <tr><td style="padding:24px 32px;background:#0b140e;border-top:1px solid #26362c;color:#8fa096;font-size:13px;line-height:1.6;">${footer}</td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function customerSnapshotHtml(name, parts){
  const oppHtml = parts.opportunities.length ? parts.opportunities.map(o=>`
    <div style="border-top:1px solid #26362c;padding:18px 0;">
      <div style="color:#63d995;font-size:12px;font-weight:800;margin-bottom:6px;">${String(o.number).padStart(2,"0")}</div>
      <h3 style="margin:0;color:#f3f4ef;font-size:20px;line-height:1.25;">${escapeHtml(o.title)}</h3>
      <p style="margin:9px 0 0;color:#b8c5bc;font-size:14px;line-height:1.55;">${escapeHtml(o.body)}</p>
    </div>`).join("") : `<div style="border-top:1px solid #26362c;padding:18px 0;"><p style="margin:0;color:#b8c5bc;line-height:1.55;">The check did not find an obvious weakness strong enough to report. That is a valid result; it does not invent criticism simply to fill the page.</p></div>`;
  const searchesHtml = parts.searches.length ? `<div style="margin-top:24px;"><h2 style="margin:0 0 10px;color:#f3f4ef;font-size:18px;">Buyer search examples</h2><div>${parts.searches.map(s=>`<span style="display:inline-block;border:1px solid #314437;border-radius:999px;padding:7px 10px;margin:0 6px 7px 0;color:#c8d3cc;font-size:13px;">${escapeHtml(s)}</span>`).join("")}</div></div>` : "";
  const bodyHtml = `
    <div style="background:#0b140e;border:1px solid #26362c;border-radius:14px;padding:18px;margin-bottom:20px;"><div style="color:#8fa096;font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;margin-bottom:8px;">Business checked</div><div style="color:#f3f4ef;font-size:20px;font-weight:800;">${escapeHtml(parts.business)}</div><div style="color:#8fa096;font-size:13px;margin-top:4px;">${escapeHtml(parts.website)}</div></div>
    <div style="background:#102018;border:1px solid #31593f;border-radius:14px;padding:18px;margin-bottom:22px;"><div style="color:#63d995;font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;margin-bottom:8px;">Comes through clearly</div><h2 style="margin:0;color:#f3f4ef;font-size:22px;line-height:1.25;">${escapeHtml(parts.strengthTitle)}</h2><p style="margin:10px 0 0;color:#b8c5bc;font-size:14px;line-height:1.55;">${escapeHtml(parts.strengthBody)}</p></div>
    <h2 style="margin:0;color:#f3f4ef;font-size:22px;">Areas worth a closer look</h2>${oppHtml}${searchesHtml}
    <p style="margin:28px 0 0;color:#8fa096;font-size:13px;line-height:1.6;">This is a quick evidence-led check of the public website. It is not a full audit and it is not a guarantee of search or AI visibility.</p>`;
  return emailShell({preheader:`Your Buyer Readiness Snapshot for ${parts.business}`,heading:"Your Buyer Readiness Snapshot",intro:`Hi ${name || "there"}, here is the snapshot you just generated. I’ll take a look too and be in touch to see how you found it and whether any of the findings are worth exploring further.`,bodyHtml,footer:`Jonny<br>Hendry Commercial<br><span style="color:#6f8175;">Helping good businesses become easier for buyers to find, understand and choose.</span>`});
}

function ownerSnapshotHtml(name,email,parts){
  const bodyHtml = `<div style="background:#0b140e;border:1px solid #26362c;border-radius:14px;padding:18px;margin-bottom:18px;"><p style="margin:0;color:#f3f4ef;font-size:16px;line-height:1.6;"><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}<br><strong>Website:</strong> ${escapeHtml(parts.website)}</p></div><h2 style="margin:0 0 12px;color:#f3f4ef;font-size:22px;">Snapshot</h2><div style="color:#b8c5bc;font-size:14px;line-height:1.65;">${textBlock(parts.summary)}</div>`;
  return emailShell({preheader:`New Buyer Readiness Snapshot lead from ${parts.business}`,heading:"New Buyer Readiness lead",intro:`${name} generated a snapshot for ${parts.business}.`,bodyHtml,footer:`Reply directly to this email to contact ${escapeHtml(name)}.`});
}

function ownerQualifiedHtml(body){
  const name=clean(body?.name,160), email=clean(body?.email,320), website=clean(body?.website,500);
  const bodyHtml = `<div style="background:#0b140e;border:1px solid #26362c;border-radius:14px;padding:18px;margin-bottom:18px;"><p style="margin:0;color:#f3f4ef;font-size:16px;line-height:1.6;"><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}<br><strong>Website:</strong> ${escapeHtml(website)}</p></div><h2 style="margin:0 0 12px;color:#f3f4ef;font-size:22px;">Commercial context</h2><p style="color:#b8c5bc;font-size:14px;line-height:1.7;margin:0;"><strong>Growth priority</strong><br>${escapeHtml(body?.growth_priority)}<br><br><strong>Desired buyer</strong><br>${escapeHtml(body?.desired_buyer)}<br><br><strong>Customer value</strong><br>${escapeHtml(body?.customer_value)}<br><br><strong>What buyers should understand</strong><br>${escapeHtml(body?.desired_understanding)}<br><br><strong>Snapshot strength</strong><br>${escapeHtml(body?.snapshot_strength)}<br><br><strong>Snapshot opportunities</strong><br>${escapeHtml(body?.snapshot_opportunities)}</p>`;
  return emailShell({preheader:`Qualified Buyer Readiness lead from ${name}`,heading:"Qualified Buyer Readiness lead",intro:`${name} added commercial context after viewing their snapshot.`,bodyHtml,footer:`Reply directly to this email to contact ${escapeHtml(name)}.`});
}

function safeResendMessage(result){
  const message = result?.data?.message || result?.data?.error || result?.data?.name || "unknown";
  return `Resend ${result?.status}: ${clean(message,240)}`;
}

async function sendEmail(env,{to,subject,html,text,replyTo}){
  const key=env.RESEND_API_KEY;
  if(!key) return {ok:false,status:500,data:{message:"Missing RESEND_API_KEY in Cloudflare"}};
  const payload={from:"Jonny at Hendry Commercial <jonny@hendrycommercial.co.uk>",to:Array.isArray(to)?to:[to],subject,html,text:text || subject,reply_to:replyTo || "jonny@hendrycommercial.co.uk"};
  const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"authorization":`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(payload)});
  const data=await r.json().catch(()=>({message:"No JSON response from Resend"}));
  return {ok:r.ok,status:r.status,data};
}

async function ensureLeadSchema(db){
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

async function upsertCanonicalLead(env,body){
  const db=env.BUYER_READINESS_DB;
  if(!db) return {ok:false,message:"Lead inbox is not configured."};

  const leadId=clean(body?.lead_id,120);
  const createdAt=clean(body?.created_at,80)||new Date().toISOString();
  const updatedAt=clean(body?.updated_at,80)||new Date().toISOString();
  const stage=clean(body?.stage,60);
  const status=stage==="qualified_lead" ? "qualified" : "snapshot";
  const website=clean(body?.website,500);
  const name=clean(body?.name,160);
  const email=clean(body?.email,320);
  const businessName=clean(body?.business_name,240) || clean(body?.domain,240) || website.replace(/^https?:\/\//,"").replace(/^www\./,"").split("/")[0];
  if(!leadId || !website || !businessName) return {ok:false,message:"Canonical lead data is incomplete."};

  const snapshot = body?.snapshot && typeof body.snapshot==="object" ? body.snapshot : {
    strength:{
      title:clean(body?.strength_title,500),
      observation:clean(body?.strength_body,1200)
    },
    opportunities:Array.isArray(body?.opportunities)?body.opportunities:[],
    buyer_search_examples:Array.isArray(body?.buyer_search_examples)?body.buyer_search_examples:[],
    facts:{},
    coverage:{}
  };
  const commercialContext = status==="qualified" ? {
    growth_priority:clean(body?.growth_priority,2500),
    desired_buyer:clean(body?.desired_buyer,2500),
    customer_value:clean(body?.customer_value,300),
    desired_understanding:clean(body?.desired_understanding,3000)
  } : {};

  const canonical={
    schema_version:"buyer-readiness-lead-1",
    lead_id:leadId,
    created_at:createdAt,
    updated_at:updatedAt,
    source:"hendrycommercial_check",
    status,
    contact:{name,email},
    business:{
      name:businessName,
      website,
      domain:clean(body?.domain,240),
      description:clean(body?.business_description,1800)
    },
    snapshot,
    commercial_context:commercialContext
  };

  await ensureLeadSchema(db);
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

  return {ok:true,lead_id:canonical.lead_id,status:canonical.status};
}

export async function onRequestPost(context){
  try{
    const body=await context.request.json();
    if(clean(body?.company_website,200)) return json({success:true,ignored:true});
    const stage=clean(body?.stage,60), name=clean(body?.name,160), email=clean(body?.email,320), website=clean(body?.website,500);
    if(!name || !validEmail(email) || !website) return json({success:false,message:"Please check your name, email and website."},400);

    const stored=await upsertCanonicalLead(context.env,body);
    if(!stored.ok) return json({success:false,message:stored.message||"I couldn't save your lead just now."},503);

    if(stage==="qualified_lead"){
      const sent=await sendEmail(context.env,{to:"jonny@hendrycommercial.co.uk",subject:`Qualified Buyer Readiness lead - ${name}`,html:ownerQualifiedHtml(body),text:`Qualified lead from ${name} (${email}) for ${website}`,replyTo:email});
      return json({success:true,leadStored:true,lead_id:stored.lead_id,status:stored.status,ownerSaved:sent.ok,warning:sent.ok?"":safeResendMessage(sent),owner_status:sent.status});
    }

    const parts=snapshotParts(body);
    const customer=await sendEmail(context.env,{to:email,subject:`Your Buyer Readiness Snapshot for ${parts.business}`,html:customerSnapshotHtml(name,parts),text:parts.summary,replyTo:"jonny@hendrycommercial.co.uk"});
    const owner=await sendEmail(context.env,{to:"jonny@hendrycommercial.co.uk",subject:`New Buyer Readiness Snapshot - ${parts.business}`,html:ownerSnapshotHtml(name,email,parts),text:`New snapshot lead from ${name} (${email}) for ${website}\n\n${parts.summary}`,replyTo:email});
    const warnings=[];
    if(!customer.ok) warnings.push(`Customer email failed: ${safeResendMessage(customer)}`);
    if(!owner.ok) warnings.push(`Owner email failed: ${safeResendMessage(owner)}`);
    return json({success:true,leadStored:true,lead_id:stored.lead_id,status:stored.status,customerEmailed:customer.ok,ownerSaved:owner.ok,warning:warnings.join(" | "),customer_status:customer.status,owner_status:owner.status});
  }catch(error){
    return json({success:true,warning:`Email diagnostic failed: ${clean(error?.message || error,240)}`});
  }
}

export function onRequest(){ return json({success:false,message:"Method not allowed."},405); }
