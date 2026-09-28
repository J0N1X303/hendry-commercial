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

async function formSubmit(payload){
  try{
    const r=await fetch("https://formsubmit.co/ajax/jonny@hendrycommercial.co.uk",{
      method:"POST",
      headers:{"content-type":"application/json","accept":"application/json"},
      body:JSON.stringify(payload)
    });
    const data=await r.json().catch(()=>({}));
    return {ok:r.ok && data.success!==false,status:r.status,data};
  }catch(error){
    return {ok:false,status:0,data:{message:"network_error"}};
  }
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

    const base={
      _subject: stage==="qualified_lead" ? "Qualified Buyer Readiness lead" : "New Buyer Readiness Snapshot lead",
      _captcha:"false",
      _template:"table",
      _url:"https://hendrycommercial.co.uk/check",
      name,
      email,
      website,
      stage
    };

    if(stage==="qualified_lead"){
      const payload={
        ...base,
        growth_priority:clean(body?.growth_priority,2500),
        desired_buyer:clean(body?.desired_buyer,2500),
        customer_value:clean(body?.customer_value,300),
        desired_understanding:clean(body?.desired_understanding,3000),
        snapshot_strength:clean(body?.snapshot_strength,1500),
        snapshot_opportunities:clean(body?.snapshot_opportunities,4000)
      };
      const sent=await formSubmit(payload);
      return sent.ok
        ? json({success:true,ownerSaved:true})
        : json({success:false,message:"I couldn't save your answers just now."},502);
    }

    const snapshot=clean(body?.snapshot_summary,12000);
    const payload={...base,snapshot_summary:snapshot,_cc:email};

    const sent=await formSubmit(payload);
    if(sent.ok){
      return json({success:true,ownerSaved:true,customerEmailed:true});
    }

    // Customer-copy delivery should never block access to the result.
    const fallback=await formSubmit({...base,snapshot_summary:snapshot});
    if(fallback.ok){
      return json({
        success:true,
        ownerSaved:true,
        customerEmailed:false,
        warning:"Your snapshot is ready, but the email copy could not be delivered."
      });
    }

    return json({
      success:false,
      ownerSaved:false,
      customerEmailed:false,
      message:"I couldn't save your snapshot just now."
    },502);
  }catch(error){
    return json({success:false,message:"I couldn't save your snapshot just now."},500);
  }
}

export function onRequest(){
  return json({success:false,message:"Method not allowed."},405);
}
