(() => {
  const state = { website:"", result:null, name:"", email:"", lead_id:"", created_at:"" };
  const screens = [...document.querySelectorAll("[data-screen]")];
  const show = (name) => { screens.forEach(s => { s.hidden = s.dataset.screen !== name; }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const norm = (v) => { let x=(v||"").trim(); if(!x) return ""; if(!/^https?:\/\//i.test(x)) x="https://"+x; try { return new URL(x).href; } catch { return ""; } };
  const domain = (url) => { try { return new URL(url).hostname.replace(/^www\./,""); } catch { return url; } };
  const esc = (s="") => s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const STORAGE_KEY = "hcBuyerReadiness";
  const saveState = () => { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} };
  const ensureLeadIdentity = () => {
    if(!state.lead_id){
      state.lead_id = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : ("lead-"+Date.now()+"-"+Math.random().toString(16).slice(2));
    }
    if(!state.created_at) state.created_at = new Date().toISOString();
  };
  const handoffPayload = (commercialContext={}) => {
    ensureLeadIdentity();
    const r=state.result||{};
    return {
      schema_version:"buyer-readiness-lead-1",
      lead_id:state.lead_id,
      created_at:state.created_at,
      updated_at:new Date().toISOString(),
      source:"hendrycommercial_check",
      status: commercialContext && Object.values(commercialContext).every(v=>String(v||"").trim()) ? "qualified" : "snapshot",
      contact:{name:state.name,email:state.email},
      business:{
        name:r.business?.name||r.domain||"",
        website:state.website,
        domain:r.domain||"",
        description:r.business?.description||""
      },
      snapshot:{
        strength:r.strength||{},
        opportunities:r.opportunities||[],
        buyer_search_examples:r.buyer_search_examples||[],
        facts:r.facts||{},
        coverage:r.coverage||{}
      },
      commercial_context:commercialContext||{}
    };
  };
  const sendHandoff = (commercialContext={}) => {
    try{
      const payload=handoffPayload(commercialContext);
      const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});
      navigator.sendBeacon("/api/buyer-readiness-store",blob);
      saveState();
    }catch{}
  };
  const restoreState = () => { try { const raw=sessionStorage.getItem(STORAGE_KEY); if(!raw) return false; const saved=JSON.parse(raw); if(saved&&saved.website) Object.assign(state,saved); return !!state.result; } catch { return false; } };

  async function runScan(website){
    show("scan");
    document.querySelectorAll("[data-domain-label]").forEach(el=>el.textContent=domain(website));
    const steps=[...document.querySelectorAll("[data-scan-step]")];
    steps.forEach((li,i)=>{li.classList.toggle("active",i===0);li.classList.remove("done");li.querySelector("b").textContent=i===0?"Checking":"Waiting";});
    let current=0;
    const timer=setInterval(()=>{ if(current>=steps.length-2) return; steps[current].classList.remove("active");steps[current].classList.add("done");steps[current].querySelector("b").textContent="Done"; current++;steps[current].classList.add("active");steps[current].querySelector("b").textContent="Checking"; },650);
    let result;
    try{ const response=await fetch("/api/buyer-readiness-check",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({website})}); result=await response.json(); if(!response.ok && result.status!=="limited") throw new Error("scan_failed"); }
    catch{ result={status:"limited",reason:"The check could not reach that website reliably. Try the main homepage address or try again in a moment."}; }
    clearInterval(timer);
    for(let i=0;i<steps.length;i++){steps[i].classList.remove("active");steps[i].classList.add("done");steps[i].querySelector("b").textContent="Done";await new Promise(r=>setTimeout(r,90));}
    if(result.status!=="complete"){document.querySelector("[data-limited-message]").textContent=result.reason||"There was not enough reliable evidence to build a useful snapshot.";show("limited");return;}
    state.result=result; renderPreview(result); show("preview");
  }

  function renderPreview(r){
    document.querySelector("[data-preview-domain]").textContent=r.domain;
    document.querySelector("[data-business-name]").textContent=r.business?.name||r.domain;
    const services=document.querySelector("[data-service-chips]"); services.innerHTML="";
    const offers=(r.facts?.offers||[]).slice(0,5); (offers.length?offers:["Offer identifiable"]).forEach(x=>services.insertAdjacentHTML("beforeend",'<span>'+esc(x)+'</span>'));
    const locations=document.querySelector("[data-location-chips]"); locations.innerHTML="";
    const locs=(r.facts?.locations||[]).slice(0,5); (locs.length?locs:["No strong structured location signal"]).forEach(x=>locations.insertAdjacentHTML("beforeend",'<span>'+esc(x)+'</span>'));
    const searches=document.querySelector("[data-search-list]"); searches.innerHTML=""; (r.buyer_search_examples||[]).forEach(x=>searches.insertAdjacentHTML("beforeend",'<span>'+esc(x)+'</span>'));
    const count=(r.opportunities||[]).length; document.querySelector("[data-finding-count]").textContent=count||"—"; document.querySelector(".unlock-card strong").textContent=count===1?"area worth a closer look":count>1?"areas worth a closer look":"a result worth reviewing";
  }

  function renderSnapshot(r){
    document.querySelector("[data-strength-title]").textContent=r.strength?.title||"Your business can be identified from the public site.";
    document.querySelector("[data-strength-body]").textContent=r.strength?.observation||"The site provides enough context to understand the organisation at a surface level.";
    const list=document.querySelector("[data-opportunity-list]"); list.innerHTML="";
    const ops=r.opportunities||[];
    document.querySelector("[data-opportunity-count]").textContent=ops.length?ops.length+" evidence-backed observation"+(ops.length===1?"":"s"):"No obvious issue forced";
    if(!ops.length){ list.innerHTML='<article class="opportunity"><span class="opportunity-no">✓</span><div><h3>No obvious weakness was strong enough to report.</h3><p>That is a valid result. This surface-level check will not invent criticism simply to fill the page.</p><small>Deeper analysis may still find opportunities once commercial context and external evidence are added.</small></div></article>'; }
    else { ops.forEach((o,i)=>{ const evidence=(o.evidence||[]).map(e=>e.fact).filter(Boolean).slice(0,2).join(" · "); const why=o.why?'<p><strong>Why it matters:</strong> '+esc(o.why)+'</p>':''; list.insertAdjacentHTML("beforeend",'<article class="opportunity"><span class="opportunity-no">0'+(i+1)+'</span><div><h3>'+esc(o.title)+'</h3><p>'+esc(o.observation)+'</p>'+why+'<small><strong>What we found:</strong> '+esc(evidence)+'</small></div></article>'); }); }
  }

  function snapshotSummary(){
    return ["Business: "+(state.result?.business?.name||state.result?.domain||""),"Website: "+state.website,"","Comes through clearly:",state.result?.strength?.title||"",state.result?.strength?.observation||"","","Areas worth a closer look:",...(state.result?.opportunities||[]).flatMap((x,i)=>[(i+1)+". "+x.title,x.observation,x.why?"Why it matters: "+x.why:""]),"","Buyer search examples:",...(state.result?.buyer_search_examples||[])].join("\n");
  }

  async function postLead(payload){
    const response=await fetch("/api/buyer-readiness-lead",{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok || data.success===false) throw new Error(data.message||"save_failed");
    return data;
  }

  document.querySelector("[data-url-form]")?.addEventListener("submit",(e)=>{ e.preventDefault(); const input=e.currentTarget.website; const website=norm(input.value); const err=document.querySelector("[data-start-error]"); if(!website){err.textContent="Enter a valid website address.";return;} err.textContent=""; state.website=website; runScan(website); });

  document.querySelector("[data-open-capture]")?.addEventListener("click",()=>show("capture"));

  document.querySelector("[data-capture-form]")?.addEventListener("submit",async(e)=>{
    e.preventDefault();
    const form=e.currentTarget; const btn=form.querySelector("button[type=submit]"); const error=document.querySelector("[data-capture-error]");
    state.name=form.elements.name.value.trim(); state.email=form.elements.email.value.trim(); error.textContent=""; btn.disabled=true; btn.textContent="Sending…"; saveState();
    try{
      const result=state.result||{};
      ensureLeadIdentity();
      const data=await postLead({
        stage:"free_snapshot",
        lead_id:state.lead_id,
        created_at:state.created_at,
        updated_at:new Date().toISOString(),
        name:state.name,
        email:state.email,
        website:state.website,
        company_website:form.elements.company_website?.value||"",
        business_name:result.business?.name||result.domain||"",
        domain:result.domain||"",
        business_description:result.business?.description||"",
        strength_title:result.strength?.title||"",
        strength_body:result.strength?.observation||"",
        opportunities:result.opportunities||[],
        buyer_search_examples:result.buyer_search_examples||[],
        snapshot:{
          strength:result.strength||{},
          opportunities:result.opportunities||[],
          buyer_search_examples:result.buyer_search_examples||[],
          facts:result.facts||{},
          coverage:result.coverage||{}
        },
        snapshot_summary:snapshotSummary()
      });
      renderSnapshot(state.result); show("snapshot");
      if(data.warning){ const heading=document.querySelector(".snapshot-heading"); if(heading&&!heading.querySelector(".delivery-note")){ const note=document.createElement("p"); note.className="delivery-note"; note.textContent=data.warning; heading.appendChild(note); } }
    }catch(err){ error.textContent="I couldn't send that just now. Please try again."; }
    finally{ btn.disabled=false; btn.innerHTML='Show my results <span>→</span>'; }
  });

  document.querySelector("[data-open-qualify]")?.addEventListener("click",()=>show("qualify"));

  document.querySelector("[data-qualify-form]")?.addEventListener("submit",async(e)=>{
    e.preventDefault();
    const form=e.currentTarget; const btn=form.querySelector("button[type=submit]"); const error=document.querySelector("[data-qualify-error]");
    error.textContent=""; btn.disabled=true; btn.textContent="Saving…"; saveState();
    try{
      ensureLeadIdentity();
      const result=state.result||{};
      await postLead({
        stage:"qualified_lead",
        lead_id:state.lead_id,
        created_at:state.created_at,
        updated_at:new Date().toISOString(),
        website:state.website,
        name:state.name,
        email:state.email,
        company_website:form.elements.company_website?.value||"",
        business_name:result.business?.name||result.domain||"",
        domain:result.domain||"",
        business_description:result.business?.description||"",
        snapshot:{
          strength:result.strength||{},
          opportunities:result.opportunities||[],
          buyer_search_examples:result.buyer_search_examples||[],
          facts:result.facts||{},
          coverage:result.coverage||{}
        },
        growth_priority:form.elements.growth_priority.value,
        desired_buyer:form.elements.desired_buyer.value,
        customer_value:form.elements.customer_value.value,
        desired_understanding:form.elements.desired_understanding.value,
        snapshot_strength:result.strength?.title||"",
        snapshot_opportunities:(result.opportunities||[]).map(x=>x.title).join(" | ")
      });
      saveState();
      show("complete");
    }
    catch(err){ error.textContent="I couldn't save that just now. Please try again."; }
    finally{ btn.disabled=false; btn.innerHTML='Finish and see the next step <span>→</span>'; }
  });

  document.querySelector("[data-back-results]")?.addEventListener("click",()=>{ if(state.result) renderSnapshot(state.result); show("snapshot"); });
  document.querySelector("[data-retry]")?.addEventListener("click",()=>{document.querySelector("[data-url-form]").reset();show("start");});

  const params=new URLSearchParams(location.search); const prefill=params.get("site"); if(restoreState() && params.get("restore")==="snapshot"){ renderSnapshot(state.result); history.replaceState({}, "", "/check"); show("snapshot"); } else if(prefill){ const input=document.querySelector("#website"); if(input) input.value=prefill; }
})();