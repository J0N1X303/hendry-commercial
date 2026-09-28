(() => {
  const state = { website:"", result:null, name:"", email:"" };
  const screens = [...document.querySelectorAll("[data-screen]")];
  const show = (name) => {
    screens.forEach(s => { s.hidden = s.dataset.screen !== name; });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const norm = (v) => {
    let x=(v||"").trim();
    if(!x) return "";
    if(!/^https?:\/\//i.test(x)) x="https://"+x;
    try { return new URL(x).href; } catch { return ""; }
  };
  const domain = (url) => { try { return new URL(url).hostname.replace(/^www\./,""); } catch { return url; } };
  const esc = (s="") => s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const STORAGE_KEY = "hcBuyerReadiness";
  const saveState = () => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  };
  const restoreState = () => {
    try {
      const raw=sessionStorage.getItem(STORAGE_KEY);
      if(!raw) return false;
      const saved=JSON.parse(raw);
      if(saved&&saved.website) Object.assign(state,saved);
      return !!state.result;
    } catch { return false; }
  };

  async function runScan(website){
    show("scan");
    document.querySelectorAll("[data-domain-label]").forEach(el=>el.textContent=domain(website));
    const steps=[...document.querySelectorAll("[data-scan-step]")];
    steps.forEach((li,i)=>{li.classList.toggle("active",i===0);li.classList.remove("done");li.querySelector("b").textContent=i===0?"Checking":"Waiting";});
    let current=0;
    const timer=setInterval(()=>{
      if(current>=steps.length-2) return;
      steps[current].classList.remove("active");steps[current].classList.add("done");steps[current].querySelector("b").textContent="Done";
      current++;steps[current].classList.add("active");steps[current].querySelector("b").textContent="Checking";
    },650);
    let result;
    try{
      const response=await fetch("/api/buyer-readiness-check",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({website})});
      result=await response.json();
      if(!response.ok && result.status!=="limited") throw new Error("scan_failed");
    }catch{
      result={status:"limited",reason:"The check could not reach that website reliably. Try the main homepage address or try again in a moment."};
    }
    clearInterval(timer);
    for(let i=0;i<steps.length;i++){steps[i].classList.remove("active");steps[i].classList.add("done");steps[i].querySelector("b").textContent="Done";await new Promise(r=>setTimeout(r,90));}
    if(result.status!=="complete"){document.querySelector("[data-limited-message]").textContent=result.reason||"There was not enough reliable evidence to build a useful snapshot.";show("limited");return;}
    state.result=result; renderPreview(result); show("preview");
  }

  function renderPreview(r){
    document.querySelector("[data-preview-domain]").textContent=r.domain;
    document.querySelector("[data-business-name]").textContent=r.business?.name||r.domain;
    const services=document.querySelector("[data-service-chips]"); services.innerHTML="";
    const offers=(r.facts?.offers||[]).slice(0,5);
    (offers.length?offers:["Offer identifiable"]).forEach(x=>services.insertAdjacentHTML("beforeend",'<span>'+esc(x)+'</span>'));
    const locations=document.querySelector("[data-location-chips]"); locations.innerHTML="";
    const locs=(r.facts?.locations||[]).slice(0,5);
    (locs.length?locs:["No strong structured location signal"]).forEach(x=>locations.insertAdjacentHTML("beforeend",'<span>'+esc(x)+'</span>'));
    const searches=document.querySelector("[data-search-list]"); searches.innerHTML="";
    (r.buyer_search_examples||[]).forEach(x=>searches.insertAdjacentHTML("beforeend",'<span>'+esc(x)+'</span>'));
    const count=(r.opportunities||[]).length;
    document.querySelector("[data-finding-count]").textContent=count||"—";
    document.querySelector(".unlock-card strong").textContent=count===1?"area worth a closer look":count>1?"areas worth a closer look":"a result worth reviewing";
  }

  function renderSnapshot(r){
    document.querySelector("[data-strength-title]").textContent=r.strength?.title||"Your business can be identified from the public site.";
    document.querySelector("[data-strength-body]").textContent=r.strength?.observation||"The site provides enough context to understand the organisation at a surface level.";
    const list=document.querySelector("[data-opportunity-list]"); list.innerHTML="";
    const ops=r.opportunities||[];
    document.querySelector("[data-opportunity-count]").textContent=ops.length?ops.length+" evidence-backed observation"+(ops.length===1?"":"s"):"No obvious issue forced";
    if(!ops.length){
      list.innerHTML='<article class="opportunity"><span class="opportunity-no">✓</span><div><h3>No obvious weakness was strong enough to report.</h3><p>That is a valid result. This surface-level check will not invent criticism simply to fill the page.</p><small>Deeper analysis may still find opportunities once commercial context and external evidence are added.</small></div></article>';
    } else {
      ops.forEach((o,i)=>{
        const evidence=(o.evidence||[]).map(e=>e.fact).filter(Boolean).slice(0,2).join(" · ");
        list.insertAdjacentHTML("beforeend",'<article class="opportunity"><span class="opportunity-no">0'+(i+1)+'</span><div><h3>'+esc(o.title)+'</h3><p>'+esc(o.observation)+'</p><small>'+esc(evidence)+'</small></div></article>');
      });
    }
  }

  document.querySelector("[data-url-form]")?.addEventListener("submit",(e)=>{
    e.preventDefault(); const input=e.currentTarget.website; const website=norm(input.value);
    const err=document.querySelector("[data-start-error]");
    if(!website){err.textContent="Enter a valid website address.";return;}
    err.textContent=""; state.website=website; runScan(website);
  });

  document.querySelector("[data-open-capture]")?.addEventListener("click",()=>{
    const summary=[
      "Business: "+(state.result?.business?.name||state.result?.domain||""),
      "Website: "+state.website,
      "",
      "Comes through clearly:",
      state.result?.strength?.title||"",
      state.result?.strength?.observation||"",
      "",
      "Areas worth a closer look:",
      ...(state.result?.opportunities||[]).flatMap((x,i)=>[(i+1)+". "+x.title,x.observation]),
      "",
      "Buyer search examples:",
      ...(state.result?.buyer_search_examples||[])
    ].join("\n");
    document.querySelector("[data-capture-website]").value=state.website;
    document.querySelector("[data-capture-summary]").value=summary;
    show("capture");
  });

  document.querySelector("[data-capture-form]")?.addEventListener("submit",(e)=>{
    const form=e.currentTarget;
    state.name=form.elements.name.value.trim();
    state.email=form.elements.email.value.trim();
    const replyto=form.querySelector("[data-capture-replyto]");
    const autoresponse=form.querySelector("[data-capture-autoresponse]");
    if(replyto) replyto.value=state.email;
    if(autoresponse){
      const result=state.result||{};
      const lines=[
        "Your Buyer Readiness Snapshot",
        "",
        (result.business?.name||result.domain||state.website),
        state.website,
        "",
        "WHAT COMES THROUGH CLEARLY",
        result.strength?.title||"",
        result.strength?.observation||"",
        "",
        "AREAS WORTH A CLOSER LOOK"
      ];
      (result.opportunities||[]).forEach((x,i)=>{
        lines.push((i+1)+". "+x.title);
        lines.push(x.observation);
        lines.push("");
      });
      lines.push("BUYER SEARCH EXAMPLES");
      (result.buyer_search_examples||[]).forEach(x=>lines.push("• "+x));
      lines.push("");
      lines.push("This is a quick evidence-led check of the public website, not a full audit or a guarantee of search or AI visibility.");
      autoresponse.value=lines.join("\n");
    }
    saveState();
  });

  document.querySelector("[data-open-qualify]")?.addEventListener("click",()=>show("qualify"));

  document.querySelector("[data-qualify-form]")?.addEventListener("submit",(e)=>{
    const form=e.currentTarget;
    const qReply=document.querySelector("[data-qualify-replyto]");
    if(qReply) qReply.value=state.email;
    saveState();
  });

  document.querySelector("[data-back-results]")?.addEventListener("click",()=>{
    if(state.result) renderSnapshot(state.result);
    show("snapshot");
  });
  document.querySelector("[data-retry]")?.addEventListener("click",()=>{document.querySelector("[data-url-form]").reset();show("start");});

  const params=new URLSearchParams(location.search);
  const submitted=params.get("submitted");
  const prefill=params.get("site");
  if(submitted==="snapshot" && restoreState()){
    renderSnapshot(state.result);
    document.querySelector("[data-qualify-website]").value=state.website;
    document.querySelector("[data-qualify-name]").value=state.name;
    document.querySelector("[data-qualify-email]").value=state.email;
    const qReply=document.querySelector("[data-qualify-replyto]");
    if(qReply) qReply.value=state.email;
    history.replaceState({}, "", "/check");
    show("snapshot");
  } else if(submitted==="qualified" && restoreState()){
    renderSnapshot(state.result);
    history.replaceState({}, "", "/check");
    show("complete");
  } else if(prefill){
    const input=document.querySelector("#website"); if(input) input.value=prefill;
  }
})();