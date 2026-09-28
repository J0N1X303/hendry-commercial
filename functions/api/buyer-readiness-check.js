const COMMON_LINKS = new Set([
  "home","about","about us","contact","contact us","blog","news","privacy","cookies","terms",
  "login","sign in","book","book now","get in touch","learn more","read more","our story"
]);

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}
function decode(s=""){
  return s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ")
    .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#x27;/g,"'");
}
function textOnly(html=""){
  return decode(html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());
}
function tagText(html,tag){
  const out=[]; const re=new RegExp("<"+tag+"[^>]*>([\\s\\S]*?)<\\/"+tag+">","gi"); let m;
  while((m=re.exec(html)) && out.length<20){ const t=textOnly(m[1]); if(t) out.push(t); }
  return out;
}
function meta(html,key){
  const patterns=[
    new RegExp('<meta[^>]+(?:name|property)=["\\']'+key+'["\\'][^>]+content=["\\']([^"\\']+)["\\']','i'),
    new RegExp('<meta[^>]+content=["\\']([^"\\']+)["\\'][^>]+(?:name|property)=["\\']'+key+'["\\']','i')
  ];
  for(const p of patterns){const m=html.match(p); if(m) return decode(m[1].trim());}
  return "";
}
function title(html){const m=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);return m?textOnly(m[1]):""}
function unique(arr){return [...new Set(arr.map(x=>x&&x.trim()).filter(Boolean))]}
function safeHostname(host){
  const h=host.toLowerCase();
  if(h==="localhost"||h.endsWith(".local")||h.endsWith(".internal")) return false;
  if(/^\d+\.\d+\.\d+\.\d+$/.test(h)){
    const p=h.split(".").map(Number);
    if(p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===192&&p[1]===168)||(p[0]===172&&p[1]>=16&&p[1]<=31)) return false;
  }
  if(h==="::1"||h.startsWith("[fc")||h.startsWith("[fd")||h.startsWith("[fe80")) return false;
  return true;
}
function normalizeUrl(input){
  let raw=(input||"").trim();
  if(!/^https?:\/\//i.test(raw)) raw="https://"+raw;
  const u=new URL(raw);
  if(!["http:","https:"].includes(u.protocol)||!safeHostname(u.hostname)) throw new Error("unsupported_url");
  u.hash=""; return u;
}
async function getHtml(url){
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),7000);
  try{
    const r=await fetch(url,{redirect:"follow",headers:{"user-agent":"HendryCommercial-BuyerReadiness/1.0 (+https://hendrycommercial.co.uk/check)","accept":"text/html,application/xhtml+xml"},signal:controller.signal});
    const type=r.headers.get("content-type")||"";
    if(!r.ok||!type.includes("text/html")) return null;
    const body=await r.text();
    if(body.length>1500000) return body.slice(0,1500000);
    return body;
  }catch{return null} finally{clearTimeout(timer)}
}
function linksFrom(html,base){
  const out=[]; const re=/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi; let m;
  while((m=re.exec(html))&&out.length<120){
    try{
      const u=new URL(decode(m[1]),base);
      if(u.origin!==base.origin||!["http:","https:"].includes(u.protocol)) continue;
      u.hash=""; const label=textOnly(m[2]).slice(0,90);
      out.push({url:u.href,label,path:u.pathname});
    }catch{}
  }
  return out;
}
function classifyLink(x){
  const s=(x.label+" "+x.path).toLowerCase();
  if(/service|solution|what-we-do|product|wedding|training|consult|design|repair|install|care|garden|venue|event|catering|account|legal|marketing|technology|it-support/.test(s)) return "offer";
  if(/case|project|portfolio|work|customer|client|testimonial|review/.test(s)) return "proof";
  if(/faq|question|how-it-works|process|pricing|price|cost|fees/.test(s)) return "decision";
  if(/contact|quote|book|enquir|appointment/.test(s)) return "action";
  return "other";
}
function schemaFacts(html){
  const facts={names:[],localities:[],regions:[],types:[]};
  const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let m;
  while((m=re.exec(html))){
    try{
      const root=JSON.parse(m[1]); const stack=Array.isArray(root)?[...root]:[root];
      while(stack.length){
        const o=stack.pop(); if(!o||typeof o!=="object") continue;
        if(o["@graph"]) stack.push(...o["@graph"]);
        if(o.name&&typeof o.name==="string") facts.names.push(o.name);
        const t=o["@type"]; if(typeof t==="string") facts.types.push(t); else if(Array.isArray(t)) facts.types.push(...t);
        const a=o.address;
        if(a&&typeof a==="object"){ if(a.addressLocality) facts.localities.push(String(a.addressLocality)); if(a.addressRegion) facts.regions.push(String(a.addressRegion)); }
        if(o.areaServed){ const a2=Array.isArray(o.areaServed)?o.areaServed:[o.areaServed]; for(const v of a2){ if(typeof v==="string") facts.localities.push(v); else if(v?.name) facts.localities.push(String(v.name)); } }
      }
    }catch{}
  }
  return Object.fromEntries(Object.entries(facts).map(([k,v])=>[k,unique(v)]));
}
function businessName(html,host,schema){
  return meta(html,"og:site_name")||schema.names[0]||title(html).split(/[|–—-]/)[0].trim()||host.replace(/^www\./,"");
}
function offerSignals(home,links){
  const nav=links.filter(x=>classifyLink(x)==="offer").map(x=>x.label).filter(x=>x.length>2&&x.length<55);
  const heads=[...tagText(home,"h1"),...tagText(home,"h2")].filter(x=>x.length>3&&x.length<70);
  const candidates=[...nav,...heads];
  return unique(candidates.filter(x=>{
    const k=x.toLowerCase().replace(/[^a-z0-9 ]/g," ").trim();
    return k&&!COMMON_LINKS.has(k)&&!/^welcome\b/.test(k)&&k.split(" ").length<=8;
  })).slice(0,6);
}
function keywordPresent(text,rx){return rx.test(text.toLowerCase())}
function makeFinding(id,dimension,title,observation,evidence){
  return {id,dimension,title,observation,confidence:evidence.length>1?0.9:0.78,evidence};
}
async function scanSite(input){
  const start=normalizeUrl(input);
  let home=await getHtml(start.href);
  if(!home&&start.protocol==="https:"){ start.protocol="http:"; home=await getHtml(start.href); }
  if(!home) return {status:"limited",reason:"We could not reliably read the public homepage."};
  const canonical=new URL(start.href); const allLinks=linksFrom(home,canonical);
  const chosen=[]; const seen=new Set();
  for(const type of ["offer","proof","decision","action"]){
    for(const l of allLinks.filter(x=>classifyLink(x)===type)){
      const k=new URL(l.url).pathname.replace(/\/$/,"")||"/"; if(seen.has(k)) continue; seen.add(k); chosen.push({...l,type}); if(chosen.length>=8) break;
    }
    if(chosen.length>=8) break;
  }
  const pages=[{url:canonical.href,label:"Homepage",type:"home",html:home}];
  const fetched=await Promise.all(chosen.map(async p=>({...p,html:await getHtml(p.url)})));
  pages.push(...fetched.filter(p=>p.html));
  const combined=pages.map(p=>textOnly(p.html)).join(" ").toLowerCase();
  const schema=schemaFacts(home);
  const name=businessName(home,canonical.hostname,schema);
  const offers=offerSignals(home,allLinks);
  const locations=unique([...schema.localities,...schema.regions]).slice(0,5);
  const offerPages=pages.filter(p=>p.type==="offer");
  const proofPages=pages.filter(p=>p.type==="proof");
  const decisionPages=pages.filter(p=>p.type==="decision");
  const hasTestimonials=keywordPresent(combined,/testimonial|what our (clients|customers|couples) say|reviews?\b/);
  const hasCases=keywordPresent(combined,/case stud|our work|projects?|portfolio/);
  const hasAwards=keywordPresent(combined,/award|accredit|certif|member of|years? experience/);
  const hasFAQ=keywordPresent(combined,/frequently asked|\bfaqs?\b|questions? (we|you)/);
  const hasProcess=keywordPresent(combined,/how it works|our process|what happens next|step 1|step one/);
  const hasStrongCTA=keywordPresent(combined,/request a quote|get a quote|book (a|your)|make an enquiry|enquire now|schedule|contact us|speak to/);
  const proofCount=[hasTestimonials,hasCases,hasAwards].filter(Boolean).length;
  const structured=schema.types.length>0;

  let strength;
  if(proofCount>=2) strength={dimension:"trust",title:"There is real proof for a buyer to work with.",observation:"The site surfaces more than one form of credibility evidence — such as customer proof, examples of work, awards, accreditations or experience."};
  else if(offerPages.length>=3) strength={dimension:"understand",title:"Your offer is given room to explain itself.",observation:"We found several dedicated pages for services or products rather than relying on the homepage to explain everything."};
  else if(hasStrongCTA) strength={dimension:"act",title:"The next step is visible.",observation:"A buyer who is convinced can find a clear route to contact, enquire, request a quote or book."};
  else strength={dimension:"understand",title:"The business can be identified from the public site.",observation:"The homepage gives enough information to establish the organisation and at least part of what it offers."};

  const findings=[];
  if(offers.length>=2&&offerPages.length<2) findings.push(makeFinding("D02","understand","Several offers are mentioned, but few have dedicated space to be understood.","The site appears to reference multiple services or offers, while giving buyers limited dedicated pages to investigate them individually.",[{fact:offers.slice(0,3).join(", ")},{fact:offerPages.length+" dedicated offer pages found in this scan"}]));
  if(proofCount===0) findings.push(makeFinding("T01","trust","Credibility is harder to verify than the offer itself.","Across the pages checked, we found little obvious customer proof, case evidence, awards, accreditations or experience evidence for a cautious buyer to verify.",[{fact:"No strong proof pattern detected across "+pages.length+" pages"}]));
  else if((hasTestimonials||hasAwards)&&proofPages.length===0) findings.push(makeFinding("T02","trust","Proof exists, but it is not easy to investigate in depth.","The site contains credibility signals, but we did not find a clear case-study, project, portfolio, testimonial or customer-evidence destination in the pages checked.",[{fact:"Proof language detected"},{fact:"No dedicated proof page found"}]));
  if(!hasFAQ&&!hasProcess&&decisionPages.length===0) findings.push(makeFinding("C01","compare","The offer is easier to see than the buying process.","We did not find an obvious FAQ, process or how-it-works route helping a buyer understand what happens after initial interest.",[{fact:"No clear FAQ/process page detected"}]));
  if(!hasStrongCTA) findings.push(makeFinding("A01","act","A convinced buyer may still have to work out the next step.","The pages checked did not consistently expose a strong enquiry, quote, booking or conversation action.",[{fact:"No strong action phrase detected"}]));
  if(locations.length===0&&keywordPresent(combined,/local|nearby|service area|areas we cover|based in|across the uk|nationwide/)) findings.push(makeFinding("D01","discover","Geographic relevance is discussed, but not strongly structured.","The site appears to talk about where it works, but we could not confidently extract a clear locality or service-area signal from the public structure.",[{fact:"Geographic language detected"},{fact:"No structured locality/service-area signal extracted"}]));
  if(!structured) findings.push(makeFinding("D03","discover","The site gives people more help than machines.","We did not detect common structured-data types on the homepage. That does not make the site invisible, but it leaves less explicit machine-readable context about the organisation.",[{fact:"No JSON-LD schema type detected on homepage"}]));

  const dedup=[]; const dims=new Set();
  for(const f of findings){if(dedup.length>=3)break;if(!dims.has(f.dimension)){dedup.push(f);dims.add(f.dimension);}}
  for(const f of findings){if(dedup.length>=3)break;if(!dedup.includes(f))dedup.push(f)}

  const primary=(offers.find(x=>x.split(" ").length<=5)||offers[0]||name).replace(/[.!?].*$/,"").trim();
  const loc=locations[0]||"";
  const searches=unique([
    loc?primary+" "+loc:primary,
    loc?primary+" near "+loc:primary+" services",
    loc?primary+" for businesses in "+loc:primary+" provider",
    loc?"best "+primary+" "+loc:"best "+primary,
    loc?primary+" "+(locations[1]||schema.regions[0]||loc):primary+" company"
  ]).slice(0,5);

  return {
    status:"complete",domain:canonical.hostname.replace(/^www\./,""),
    business:{name,description:meta(home,"description")||meta(home,"og:description")||tagText(home,"h1")[0]||""},
    facts:{offers:offers.slice(0,5),locations,structured_types:schema.types.slice(0,8)},
    buyer_search_examples:searches,
    strength,opportunities:dedup,
    coverage:{pages_crawled:pages.length,offer_pages:offerPages.length,proof_pages:proofPages.length,decision_pages:decisionPages.length}
  };
}

export async function onRequestPost(context){
  try{
    const body=await context.request.json();
    const result=await scanSite(body?.website);
    return json(result);
  }catch(e){
    return json({status:"limited",reason:"That address could not be checked reliably. Please try the main website address, for example example.co.uk."},400);
  }
}

export function onRequest(context){
  return json({error:"method_not_allowed"},405);
}
