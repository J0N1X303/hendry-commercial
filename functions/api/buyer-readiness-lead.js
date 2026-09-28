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
  return clean(value,20000)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

function textBlock(value){
  return escapeHtml(value).replace(/\n/g,"<br>");
}

function snapshotParts(body){
  const business=clean(body?.business_name,180) || clean(body?.domain,180) || "your business";
  const website=clean(body?.website,500);
  const strengthTitle=clean(body?.strength_title,500);
  const strengthBody=clean(body?.strength_body,1200);
  const opportunities=Array.isArray(body?.opportunities) ? body.opportunities.slice(0,5).map((x,i)=>({
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
    <div style="background:#0b140e;border:1px solid #26362c;border-radius:14px;padding:18px;margin-bottom:20px;">
      <div style="color:#8fa096;font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;margin-bottom:8px;">Business checked</div>
      <div style="color:#f3f4ef;font-size:20px;font-weight:800;">${escapeHtml(parts.business)}</div>
      <div style="color:#8fa096;font-size:13px;margin-top:4px;">${escapeHtml(parts.website)}</div>
    </div>
    <div style="background:#102018;border:1px solid #31593f;border-radius:14px;padding:18px;margin-bottom:22px;">
      <div style="color:#63d995;font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;margin-bottom:8px;">Comes through clearly</div>
      <h2 style="margin:0;color:#f3f4ef;font-size:22px;line-height:1.25;">${escapeHtml(parts.strengthTitle)}</h2>
      <p style="margin:10px 0 0;color:#b8c5bc;font-size:14px;line-height:1.55;">${escapeHtml(parts.strengthBody)}</p>
    </div>
    <h2 style="margin:0;color:#f3f4ef;font-size:22px;">Areas worth a closer look</h2>
    ${oppHtml}
    ${searchesHtml}
    <p style="margin:28px 0 0;color:#8fa096;font-size:13px;line-height:1.6;">This is a quick evidence-led check of the public website. It is not a full audit and it is not a guarantee of search or AI visibility.</p>`;

  return emailShell({
    preheader:`Your Buyer Readiness Snapshot for ${parts.business}`,
    heading:"Your Buyer Readiness Snapshot",
    intro:`Hi ${name || "there"}, here is the snapshot you just generated. I’ll take a look too and be in touch to see how you found it and whether any of the findings are worth exploring further.`,
    bodyHtml,
    footer:`Jonny<br>Hendry Commercial<br><span style="color:#6f8175;">Helping good businesses become easier for buyers to find, understand and choose.</span>`
  });
}

function ownerSnapshotHtml(name,email,parts){
  const bodyHtml = `
    <div style="background:#0b140e;border:1px solid #26362c;border-radius:14px;padding:18px;margin-bottom:18px;">
      <p style="margin:0;color:#f3f4ef;font-size:16px;line-height:1.6;"><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}<br><strong>Website:</strong> ${escapeHtml(parts.website)}</p>
    </div>
    <h2 style="margin:0 0 12px;color:#f3f4ef;font-size:22px;">Snapshot</h2>
    <div style="color:#b8c5bc;font-size:14px;line-height:1.65;">${textBlock(parts.summary)}</div>`;
  return emailShell({
    preheader:`New Buyer Readiness Snapshot lead from ${parts.business}`,
    heading:"New Buyer Readiness lead",
    intro:`${name} generated a snapshot for ${parts.business}.`,
    bodyHtml,
    footer:`Reply directly to this email to contact ${escapeHtml(name)}.`
  });
}

function ownerQualifiedHtml(body){
  const name=clean(body?.name,160);
  const email=clean(body?.email,320);
  const website=clean(body?.website,500);
  const bodyHtml = `
    <div style="background:#0b140e;border:1px solid #26362c;border-radius:14px;padding:18px;margin-bottom:18px;">
      <p style="margin:0;color:#f3f4ef;font-size:16px;line-height:1.6;"><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}<br><strong>Website:</strong> ${escapeHtml(website)}</p>
    </div>
    <h2 style="margin:0 0 12px;color:#f3f4ef;font-size:22px;">Commercial context</h2>
    <p style="color:#b8c5bc;font-size:14px;line-height:1.7;margin:0;"><strong>Growth priority</strong><br>${escapeHtml(body?.growth_priority)}<br><br><strong>Desired buyer</strong><br>${escapeHtml(body?.desired_buyer)}<br><br><strong>Customer value</strong><br>${escapeHtml(body?.customer_value)}<br><br><strong>What buyers should understand</strong><br>${escapeHtml(body?.desired_understanding)}<br><br><strong>Snapshot strength</strong><br>${escapeHtml(body?.snapshot_strength)}<br><br><strong>Snapshot opportunities</strong><br>${escapeHtml(body?.snapshot_opportunities)}</p>`;
  return emailShell({
    preheader:`Qualified Buyer Readiness lead from ${name}`,
    heading:"Qualified Buyer Readiness lead",
    intro:`${name} added commercial context after viewing their snapshot.`,
    bodyHtml,
    footer:`Reply directly to this email to contact ${escapeHtml(name)}.`
  });
}

async function sendEmail(env,{to,subject,html,text,replyTo}){
  const key=env.RESEND_API_KEY;
  if(!key) return {ok:false,status:500,data:{message:"Missing RESEND_API_KEY"}};
  const payload={
    from:"Jonny at Hendry Commercial <jonny@hendrycommercial.co.uk>",
    to:Array.isArray(to)?to:[to],
    subject,
    html,
    text:text || subject,
    reply_to:replyTo || "jonny@hendrycommercial.co.uk"
  };
  const r=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"authorization":`Bearer ${key}`,"content-type":"application/json"},
    body:JSON.stringify(payload)
  });
  const data=await r.json().catch(()=>({}));
  return {ok:r.ok,status:r.status,data};
}

export async function onRequestPost(context){
  try{
    const body=await context.request.json();
    if(clean(body?.company_website,200)) return json({success:true,ignored:true});

    const stage=clean(body?.stage,60);
    const name=clean(body?.name,160);
    const email=clean(body?.email,320);
    const website=clean(body?.website,500);

    if(!name || !validEmail(email) || !website){
      return json({success:false,message:"Please check your name, email and website."},400);
    }

    if(stage==="qualified_lead"){
      const html=ownerQualifiedHtml(body);
      const sent=await sendEmail(context.env,{
        to:"jonny@hendrycommercial.co.uk",
        subject:`Qualified Buyer Readiness lead - ${name}`,
        html,
        text:`Qualified lead from ${name} (${email}) for ${website}`,
        replyTo:email
      });
      return sent.ok
        ? json({success:true,ownerSaved:true})
        : json({success:false,message:"I couldn't save your answers just now.",resend_status:sent.status,resend_data:sent.data},502);
    }

    const parts=snapshotParts(body);
    const customer=await sendEmail(context.env,{
      to:email,
      subject:`Your Buyer Readiness Snapshot for ${parts.business}`,
      html:customerSnapshotHtml(name,parts),
      text:parts.summary,
      replyTo:"jonny@hendrycommercial.co.uk"
    });

    const owner=await sendEmail(context.env,{
      to:"jonny@hendrycommercial.co.uk",
      subject:`New Buyer Readiness Snapshot - ${parts.business}`,
      html:ownerSnapshotHtml(name,email,parts),
      text:`New snapshot lead from ${name} (${email}) for ${website}\n\n${parts.summary}`,
      replyTo:email
    });

    return json({
      success:customer.ok || owner.ok,
      customerEmailed:customer.ok,
      ownerSaved:owner.ok,
      warning: customer.ok && owner.ok ? "" : "One of the email notifications could not be delivered.",
      customer_status:customer.status,
      owner_status:owner.status
    }, customer.ok || owner.ok ? 200 : 502);
  }catch(error){
    return json({success:false,message:"I couldn't send your snapshot just now."},500);
  }
}

export function onRequest(){
  return json({success:false,message:"Method not allowed."},405);
}
