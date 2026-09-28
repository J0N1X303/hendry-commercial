const COMMON_LINKS = new Set([
  "home","about","about us","contact","contact us","blog","news","privacy","cookies","terms",
  "login","sign in","book","book now","get in touch","learn more","read more","our story"
]);

const KNOWN_LOCATIONS = [
  "Berkshire","Reading","Newbury","Thatcham","Basingstoke","Hampshire","Oxfordshire","Surrey","Wiltshire",
  "London","Bristol","Bath","Oxford","Winchester","Southampton","Portsmouth","Guildford","Wokingham","Bracknell","Marlborough","Andover"
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function decode(s = "") {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;/g, "'");
}

function textOnly(html = "") {
  return decode(html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function tagText(html, tag) {
  const out = [];
  const re = new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "gi");
  let m;
  while ((m = re.exec(html)) && out.length < 30) {
    const t = textOnly(m[1]);
    if (t) out.push(t);
  }
  return out;
}

function attrsFromTag(tag) {
  const attrs = {};
  const re = /([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m;
  while ((m = re.exec(tag))) attrs[m[1].toLowerCase()] = decode((m[2] ?? m[3] ?? m[4] ?? "").trim());
  return attrs;
}

function meta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const wanted = String(key || "").toLowerCase();
  for (const tag of tags) {
    const attrs = attrsFromTag(tag);
    const ident = (attrs.name || attrs.property || "").toLowerCase();
    if (ident === wanted && attrs.content) return attrs.content;
  }
  return "";
}

function canonicalFromHtml(html, base) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = attrsFromTag(tag);
    const rel = (attrs.rel || "").toLowerCase().split(/\s+/);
    if (rel.includes("canonical") && attrs.href) {
      try { return new URL(attrs.href, base); } catch {}
    }
  }
  return null;
}

function title(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? textOnly(m[1]) : "";
}

function unique(arr) {
  return [...new Set(arr.map(x => x && String(x).trim()).filter(Boolean))];
}

function siteKey(hostname = "") {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function sameSite(a, b) {
  return siteKey(a.hostname) === siteKey(b.hostname);
}

function safeHostname(host) {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const p = h.split(".").map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254) ||
      (p[0] === 192 && p[1] === 168) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31)) return false;
  }
  if (h === "::1" || h.startsWith("[fc") || h.startsWith("[fd") || h.startsWith("[fe80")) return false;
  return true;
}

function normalizeUrl(input) {
  let raw = (input || "").trim();
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  const u = new URL(raw);
  if (!["http:", "https:"].includes(u.protocol) || !safeHostname(u.hostname)) throw new Error("unsupported_url");
  u.hash = "";
  return u;
}

async function getHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "HendryCommercial-BuyerReadiness/1.0 (+https://hendrycommercial.co.uk/check)",
        "accept": "text/html,application/xhtml+xml"
      },
      signal: controller.signal
    });
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.includes("text/html")) return null;
    let html = await r.text();
    if (html.length > 1500000) html = html.slice(0, 1500000);
    return { html, finalUrl: r.url || url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function linksFrom(html, base) {
  const out = [];
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && out.length < 180) {
    try {
      const u = new URL(decode(m[1]), base);
      if (!["http:", "https:"].includes(u.protocol) || !sameSite(u, base)) continue;
      u.hash = "";
      u.protocol = base.protocol;
      u.hostname = base.hostname;
      const label = textOnly(m[2]).slice(0, 90);
      out.push({ url: u.href, label, path: u.pathname });
    } catch {}
  }
  return out;
}

function classifyLink(x) {
  const s = (x.label + " " + x.path).toLowerCase();
  if (/service|solution|what-we-do|product|wedding|training|consult|design|repair|install|care|garden|venue|event|catering|account|legal|marketing|technology|it-support|private hire|corporate|spaces/.test(s)) return "offer";
  if (/case|project|portfolio|work|customer|client|testimonial|review|gallery|award|accreditation|real weddings/.test(s)) return "proof";
  if (/faq|question|how-it-works|process|pricing|price|cost|fees|brochure|packages|availability|planning|capacity/.test(s)) return "decision";
  if (/contact|quote|book|enquir|appointment|visit|viewing/.test(s)) return "action";
  return "other";
}

function schemaFacts(html) {
  const facts = { names: [], localities: [], regions: [], types: [] };
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const root = JSON.parse(m[1]);
      const stack = Array.isArray(root) ? [...root] : [root];
      while (stack.length) {
        const o = stack.pop();
        if (!o || typeof o !== "object") continue;
        if (o["@graph"]) stack.push(...o["@graph"]);
        if (o.name && typeof o.name === "string") facts.names.push(o.name);
        const t = o["@type"];
        if (typeof t === "string") facts.types.push(t);
        else if (Array.isArray(t)) facts.types.push(...t);
        const a = o.address;
        if (a && typeof a === "object") {
          if (a.addressLocality) facts.localities.push(String(a.addressLocality));
          if (a.addressRegion) facts.regions.push(String(a.addressRegion));
        }
        if (o.areaServed) {
          const areas = Array.isArray(o.areaServed) ? o.areaServed : [o.areaServed];
          for (const v of areas) {
            if (typeof v === "string") facts.localities.push(v);
            else if (v?.name) facts.localities.push(String(v.name));
          }
        }
      }
    } catch {}
  }
  return Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, unique(v)]));
}

function escapeRegex(value = "") {
  return String(value).replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");
}

function locationsFromText(text) {
  const t = " " + text + " ";
  return KNOWN_LOCATIONS.filter(place => new RegExp("\\b" + escapeRegex(place) + "\\b", "i").test(t));
}

function isBroadScope(value = "") {
  return /^(worldwide|global|globally|international|internationally|nationwide|national|remote|online|anywhere|all regions)$/i.test(String(value).trim());
}

function scopeSignals(text, schema) {
  const lower = text.toLowerCase();
  const schemaAreas = [...(schema.localities || []), ...(schema.regions || [])];
  const out = [];
  if (schemaAreas.some(isBroadScope) || /\bworldwide\b|\bglobally\b|\bglobal delivery\b|\bmultinational\b|\binternational delivery\b|\bany time zone\b/.test(lower)) {
    out.push("Global / multinational delivery");
  }
  if (/\bvirtual delivery\b|\bonline delivery\b|\bremote delivery\b/.test(lower)) {
    out.push("Virtual delivery");
  }
  return unique(out).slice(0, 3);
}

function businessName(html, host, schema) {
  return meta(html, "og:site_name") || schema.names[0] || title(html).split(/[|–—-]/)[0].trim() || host.replace(/^www\./, "");
}

function offerSignals(home, links) {
  const nav = links.filter(x => classifyLink(x) === "offer").map(x => x.label).filter(x => x.length > 2 && x.length < 55);
  const heads = [...tagText(home, "h1"), ...tagText(home, "h2")].filter(x => x.length > 3 && x.length < 70);
  return unique([...nav, ...heads].filter(x => {
    const k = x.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
    return k && !COMMON_LINKS.has(k) && !/^welcome\b/.test(k) && k.split(" ").length <= 8;
  })).slice(0, 6);
}

function keywordPresent(text, rx) {
  return rx.test(text.toLowerCase());
}

function whyItMatters(dimension) {
  if (dimension === "discover") return "If a buyer starts with the need or location rather than your name, clear context helps them decide whether you belong on the shortlist.";
  if (dimension === "trust") return "Proof is most useful when a buyer can connect it quickly to the claim or part of the offer they are evaluating.";
  if (dimension === "compare") return "When key answers are spread across pages or documents, buyers — and the tools helping them research — have to assemble the picture themselves.";
  if (dimension === "understand") return "A buyer cannot confidently compare an offer they have not fully understood.";
  if (dimension === "act") return "Even an interested buyer can drop out if the next step is not obvious.";
  return "";
}

function makeFinding(id, dimension, title, observation, evidence) {
  return { id, dimension, title, observation, why: whyItMatters(dimension), confidence: evidence.length > 1 ? 0.9 : 0.8, evidence };
}

function choosePages(allLinks) {
  const chosen = [];
  const seen = new Set();
  const quotas = { offer: 3, proof: 2, decision: 2, action: 1, other: 2 };
  const add = (l, type) => {
    const u = new URL(l.url);
    const k = (u.pathname.replace(/\/$/, "") || "/") + u.search;
    if (seen.has(k) || chosen.length >= 10) return;
    seen.add(k);
    chosen.push({ ...l, type });
  };
  for (const type of ["offer", "proof", "decision", "action", "other"]) {
    for (const l of allLinks.filter(x => classifyLink(x) === type)) {
      if (chosen.filter(x => x.type === type).length >= quotas[type]) break;
      add(l, type);
    }
  }
  for (const l of allLinks) {
    if (chosen.length >= 10) break;
    add(l, classifyLink(l));
  }
  return chosen;
}

function inferPrimarySearch(offers, name, combined) {
  const lower = combined.toLowerCase();
  if (/wedding|bride|groom|ceremony|reception/.test(lower)) return "wedding venue";
  if (/commercial capability/.test(lower) && /training|programme|learning/.test(lower)) return "commercial capability training";
  if (/sales training/.test(lower) && /negotiat|selling|sales/.test(lower)) return "sales training";
  if (/tree surgeon|arborist|arboricultural|stump grinding/.test(lower)) return "tree surgeon";
  if (/it support|managed it|cyber security|technology support/.test(lower)) return "IT support";
  const nonBrand = offers.find(x => x && !name.toLowerCase().includes(x.toLowerCase()) && !/^(weddings|events|services|solutions)$/i.test(x));
  return (nonBrand || offers[0] || name).replace(/[.!?].*$/, "").trim();
}

function searchExamples(primary, locations, combined, scopes = []) {
  const lower = combined.toLowerCase();
  const globalScope = scopes.includes("Global / multinational delivery");
  const loc = globalScope ? "" : (locations[0] || "");
  const out = [];
  const add = x => { if (x && !out.includes(x)) out.push(x); };

  if (primary === "commercial capability training" || primary === "sales training") {
    add(primary);
    if (/commercial skills/.test(lower)) add("commercial skills training");
    if (/\bsales\b|selling/.test(lower)) add(globalScope ? "global sales training" : "sales training provider");
    if (/negotiat/.test(lower)) add("negotiation training for sales teams");
    if (/multinational|global teams|globally placed|six languages|any time zone/.test(lower)) add("sales training for global teams");
    if (/leadership|coaching/.test(lower)) add("commercial coaching training");
    return out.slice(0, 5);
  }

  add(loc ? primary + " " + loc : primary);

  if (primary === "wedding venue") {
    if (loc) add(primary + " near " + loc);
    if (/barn/.test(lower)) add(loc ? "barn wedding venue " + loc : "barn wedding venue");
    if (/exclusive/.test(lower)) add(loc ? "exclusive use wedding venue " + loc : "exclusive use wedding venue");
    if (/accommodation|rooms|stay/.test(lower)) add(loc ? "wedding venue with accommodation " + loc : "wedding venue with accommodation");
  } else if (loc) {
    add(primary + " near " + loc);
    add(primary + " services " + loc);
    if (locations[1]) add(primary + " " + locations[1]);
  } else {
    add(primary + " provider");
    add(primary + " services");
  }

  return out.slice(0, 5);
}

function hasDedicatedLocationPage(pages, locations, primary) {
  return pages.some(p => {
    const path = (p.path || new URL(p.url).pathname).toLowerCase();
    const txt = textOnly(p.html).toLowerCase();
    return locations.some(l => path.includes(l.toLowerCase()) && txt.includes(primary.toLowerCase()));
  });
}

function locationMentionsByPage(pages, locations) {
  const out = {};
  for (const loc of locations) {
    out[loc] = pages.filter(p => new RegExp("\\b" + loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(textOnly(p.html))).map(p => p.type);
  }
  return out;
}

async function scanSite(input) {
  const start = normalizeUrl(input);

  const homepageCandidates = [];
  const pushCandidate = (u) => {
    try {
      const x = new URL(u);
      x.hash = "";
      if (!homepageCandidates.includes(x.href)) homepageCandidates.push(x.href);
    } catch {}
  };

  pushCandidate(start.href);

  const toggled = new URL(start.href);
  toggled.hostname = toggled.hostname.startsWith("www.")
    ? toggled.hostname.replace(/^www\./, "")
    : "www." + toggled.hostname;
  pushCandidate(toggled.href);

  if (start.protocol === "https:") {
    const httpStart = new URL(start.href);
    httpStart.protocol = "http:";
    pushCandidate(httpStart.href);

    const httpToggle = new URL(toggled.href);
    httpToggle.protocol = "http:";
    pushCandidate(httpToggle.href);
  }

  let homeResp = null;
  for (const candidate of homepageCandidates) {
    homeResp = await getHtml(candidate);
    if (homeResp) break;
  }

  if (!homeResp) {
    return {
      status: "limited",
      reason: "We could not reliably reach that website. Check the current homepage address — the site may have moved, changed domain, or be blocking automated access."
    };
  }

  let canonical = new URL(homeResp.finalUrl || start.href);
  const declared = canonicalFromHtml(homeResp.html, canonical);
  if (declared && sameSite(declared, canonical)) {
    declared.hash = "";
    if (declared.href !== canonical.href) {
      const refetched = await getHtml(declared.href);
      if (refetched?.html) {
        homeResp = refetched;
        canonical = new URL(refetched.finalUrl || declared.href);
      } else {
        canonical = declared;
      }
    }
  }

  const home = homeResp.html;
  const allLinks = linksFrom(home, canonical);
  const chosen = choosePages(allLinks);
  const pages = [{ url: canonical.href, path: canonical.pathname, label: "Homepage", type: "home", html: home }];
  const fetched = await Promise.all(chosen.map(async p => {
    const r = await getHtml(p.url);
    return { ...p, html: r?.html || null, finalUrl: r?.finalUrl || p.url };
  }));
  pages.push(...fetched.filter(p => p.html));

  const discoveredLinks = pages.flatMap(p => linksFrom(p.html, canonical));
  const decisionPdfLinks = unique(
    discoveredLinks
      .filter(l => /\.pdf(?:$|\?)/i.test(l.url) && /faq|question|price|pricing|pricelist|brochure|package|menu|information|guide/i.test((l.label + " " + l.url).toLowerCase()))
      .map(l => l.label || new URL(l.url).pathname.split("/").pop())
  ).slice(0, 4);

  const combinedText = pages.map(p => textOnly(p.html)).join(" ");
  const combined = combinedText.toLowerCase();
  const schema = schemaFacts(home);
  const name = businessName(home, canonical.hostname, schema);
  const offers = offerSignals(home, allLinks);
  const scopes = scopeSignals(combinedText, schema);
  const locations = unique([...schema.localities, ...schema.regions, ...locationsFromText(combinedText)])
    .filter(v => !isBroadScope(v))
    .slice(0, 5);
  const primary = inferPrimarySearch(offers, name, combined);
  const offerPages = pages.filter(p => p.type === "offer");
  const proofPages = pages.filter(p => p.type === "proof");
  const decisionPages = pages.filter(p => p.type === "decision");
  const faqPages = pages.filter(p => /frequently asked|\bfaqs?\b/i.test(textOnly(p.html)));
  const standaloneFaqLinks = allLinks.filter(l => /(^|\/)(faq|faqs|frequently-asked-questions)(\/|$)/i.test(l.path));
  const deepProofLinks = allLinks.filter(l => /case|customer-story|success-story|testimonial|measured-impact|results/i.test((l.label + " " + l.path).toLowerCase()));

  const hasTestimonials = keywordPresent(combined, /testimonial|what our (clients|customers|couples) say|reviews?\b/);
  const hasCases = keywordPresent(combined, /case stud|our work|projects?|portfolio|gallery|real weddings/);
  const hasAwards = keywordPresent(combined, /award|accredit|certif|member of|years? experience/);
  const hasFAQ = keywordPresent(combined, /frequently asked|\bfaqs?\b|questions? (we|you)/);
  const hasProcess = keywordPresent(combined, /how it works|our process|what happens next|step 1|step one|viewing|visit|appointment/);
  const hasStrongCTA = keywordPresent(combined, /request a quote|get a quote|book (a|your)|make an enquiry|enquire now|schedule|contact us|speak to|arrange a viewing/);
  const structured = schema.types.length > 0;
  const proofCount = [hasTestimonials, hasCases, hasAwards].filter(Boolean).length;
  const offerPagesWithProof = offerPages.filter(p => /testimonial|review|case stud|customer story|real wedding|hitched|award|accredit|trusted by|global clients/i.test(textOnly(p.html))).length;

  let strength;
  if (proofCount >= 2) strength = { dimension: "trust", title: primary === "wedding venue" ? "There is strong proof behind the venue." : "There is strong proof behind the business.", observation: "We found more than one form of credibility evidence, including customer proof, examples of work, awards, accreditations or experience." };
  else if (offerPages.length >= 3) strength = { dimension: "understand", title: "Your offer is given room to explain itself.", observation: "We found several dedicated pages for services or products rather than relying on the homepage to explain everything." };
  else if (hasStrongCTA) strength = { dimension: "act", title: "The next step is visible.", observation: "A buyer who is convinced can find a clear route to contact, enquire, request a quote or book." };
  else strength = { dimension: "understand", title: "The business can be identified from the public site.", observation: "The homepage gives enough information to establish the organisation and at least part of what it offers." };

  const findings = [];
  const majorLocs = locations.filter(l => ["Berkshire", "Reading", "Newbury", "Hampshire", "London"].includes(l)).slice(0, 3);

  if (primary === "wedding venue" && majorLocs.length && !hasDedicatedLocationPage(pages, majorLocs, primary)) {
    findings.push(makeFinding("D10", "discover", "The venue is easy to place, but nearby-search relevance is less explicit.", `The site clearly gives us location signals such as ${majorLocs.join(", ")}. What we did not find was a dedicated page or section connecting the venue to the nearby-location searches buyers may use when building a shortlist.`, [{ fact: `Location signals found: ${majorLocs.join(", ")}` }, { fact: "No dedicated location-intent page detected in the pages checked" }]));
  } else if (locations.length === 0 && keywordPresent(combined, /local|nearby|service area|areas we cover|based in|across the uk|nationwide|berkshire|reading/)) {
    findings.push(makeFinding("D01", "discover", "Geographic relevance is discussed, but not strongly structured.", "The site appears to talk about where it works, but we could not confidently extract a clear locality or service-area signal from the public structure.", [{ fact: "Geographic language detected" }, { fact: "No structured locality/service-area signal extracted" }]));
  }

  if (proofCount === 0) {
    findings.push(makeFinding("T01", "trust", "Credibility is harder to verify than the offer itself.", "Across the pages checked, we found little obvious customer proof, case evidence, awards, accreditations or experience evidence for a cautious buyer to verify.", [{ fact: "No strong proof pattern detected across " + pages.length + " pages" }]));
  } else if ((hasTestimonials || hasAwards || hasCases) && primary === "wedding venue" && offerPagesWithProof < Math.min(2, Math.max(1, offerPages.length))) {
    findings.push(makeFinding("T12", "trust", "Strong proof exists, but it is not consistently tied to the offer.", "We found testimonials, real-wedding evidence or other credibility signals, but relatively little of that proof appears directly within the venue and offer pages we checked.", [{ fact: "Dedicated proof signals were found" }, { fact: offerPagesWithProof + " of " + offerPages.length + " offer pages checked contained obvious proof signals" }]));
  } else if ((hasTestimonials || hasAwards || hasCases) && proofPages.length < 2) {
    findings.push(makeFinding("T12", "trust", "Proof exists, but it is concentrated in relatively few places.", "The site contains credibility signals, but they are not spread widely across the pages a buyer may use to understand and compare the offer.", [{ fact: "Proof signals detected" }, { fact: proofPages.length + " proof-focused pages checked" }]));
  }

  if (primary !== "wedding venue" && proofCount >= 2 && deepProofLinks.length <= 1 && offerPages.length >= 2 && !findings.some(f => f.dimension === "trust")) {
    findings.push(makeFinding(
      "T20",
      "trust",
      "Social proof is strong, but deeper proof is less obvious to follow.",
      "Recognisable client and credibility signals are easy to find. The scan found fewer obvious routes into detailed outcome, customer-story or case evidence for a buyer who wants to verify the claims in depth.",
      [
        { fact: "Multiple credibility signals detected" },
        { fact: deepProofLinks.length + " obvious deep-proof route" + (deepProofLinks.length === 1 ? "" : "s") + " found from the homepage" }
      ]
    ));
  }

  if (primary === "wedding venue" && decisionPdfLinks.length) {
    findings.push(makeFinding("C12", "compare", "Some important buying answers sit outside the main page flow.", "We found useful decision information in downloadable documents such as FAQs, pricing or guides. Buyers can still reach it, but some of the picture sits outside the pages they are already reading.", [{ fact: "Decision documents found: " + decisionPdfLinks.join(", ") }, { fact: decisionPages.length + " decision-focused web pages checked" }]));
  } else if (primary === "wedding venue") {
    findings.push(makeFinding("C12", "compare", "Important decision information is spread across the journey.", "The site contains useful information for prospective couples, but the scan did not find one clear route bringing the main comparison questions together.", [{ fact: decisionPages.length + " decision-focused pages checked" }, { fact: "No single consolidated decision route detected in the pages checked" }]));
  } else if (!hasFAQ && !hasProcess && decisionPages.length === 0) {
    findings.push(makeFinding("C01", "compare", "The offer is easier to see than the buying process.", "We did not find an obvious FAQ, process or how-it-works route helping a buyer understand what happens after initial interest.", [{ fact: "No clear FAQ/process page detected" }]));
  }

  if (primary !== "wedding venue" && faqPages.length >= 2 && standaloneFaqLinks.length === 0) {
    findings.push(makeFinding(
      "C20",
      "compare",
      "Useful buyer questions are answered, but across several pages.",
      "We found FAQ content in multiple parts of the site. That is useful, but a buyer with cross-cutting questions may need to move between solution and approach pages to assemble the full picture.",
      [
        { fact: faqPages.length + " pages with FAQ content checked" },
        { fact: "No standalone FAQ hub detected from the homepage" }
      ]
    ));
  }

  if (offers.length >= 2 && offerPages.length < 2) {
    findings.push(makeFinding("U02", "understand", "Several offers are mentioned, but few have dedicated space to be understood.", "The site appears to reference multiple services or offers, while giving buyers limited dedicated pages to investigate them individually.", [{ fact: offers.slice(0, 3).join(", ") }, { fact: offerPages.length + " dedicated offer pages found in this scan" }]));
  }

  if (!hasStrongCTA) {
    findings.push(makeFinding("A01", "act", "A convinced buyer may still have to work out the next step.", "The pages checked did not consistently expose a strong enquiry, quote, booking or conversation action.", [{ fact: "No strong action phrase detected" }]));
  }

  if (!structured) {
    findings.push(makeFinding("D03", "discover", "The site gives people more help than machines.", "We did not detect common structured-data types on the homepage. That does not make the site invisible, but it leaves less explicit machine-readable context about the organisation.", [{ fact: "No JSON-LD schema type detected on homepage" }]));
  }

  const dedup = [];
  const dims = new Set();
  for (const f of findings) {
    if (dedup.length >= 3) break;
    if (!dims.has(f.dimension)) {
      dedup.push(f);
      dims.add(f.dimension);
    }
  }
  for (const f of findings) {
    if (dedup.length >= 3) break;
    if (!dedup.includes(f)) dedup.push(f);
  }

  const searches = searchExamples(primary, locations, combined, scopes);

  return {
    status: "complete",
    domain: siteKey(canonical.hostname),
    canonical_url: canonical.href,
    input_url: start.href,
    business: { name, description: meta(home, "description") || meta(home, "og:description") || tagText(home, "h1")[0] || "" },
    facts: { offers: offers.slice(0, 5), locations, scope_signals: scopes, structured_types: schema.types.slice(0, 8) },
    buyer_search_examples: searches,
    strength,
    opportunities: dedup,
    coverage: {
      pages_crawled: pages.length,
      offer_pages: offerPages.length,
      proof_pages: proofPages.length,
      decision_pages: decisionPages.length,
      canonical_host: canonical.hostname,
      location_mentions: locationMentionsByPage(pages, locations),
      offer_pages_with_proof: offerPagesWithProof,
      decision_documents: decisionPdfLinks,
      faq_pages: faqPages.length,
      standalone_faq_links: standaloneFaqLinks.length,
      deep_proof_links: deepProofLinks.length
    }
  };
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    return json(await scanSite(body?.website));
  } catch (e) {
    return json({ status: "limited", reason: "That address could not be checked reliably. Please try the main website address, for example example.co.uk." }, 400);
  }
}

export function onRequest() {
  return json({ error: "method_not_allowed" }, 405);
}
