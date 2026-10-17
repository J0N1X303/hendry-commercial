// Casey Beta verified identity. No trusted identity is taken from browser JSON.
// Requires Cloudflare Access RS256 signature verification, exact issuer and app AUD.
let cache=null;
const deny=(status=403)=>new Response("Casey beta access unavailable.",{status,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow, noarchive"}});
const decode=part=>{
  if(!/^[A-Za-z0-9_-]+$/.test(part)||part.length>12000)throw Error("malformed");
  const s=atob(part.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(part.length/4)*4,"="));
  return Uint8Array.from(s,c=>c.charCodeAt(0));
};
const payload=bytes=>JSON.parse(new TextDecoder().decode(bytes));
const emails=s=>new Set(String(s||"").split(",").map(e=>e.trim().toLowerCase()).filter(Boolean));
const teamDomain=value=>{
  const str=String(value||"").trim();
  if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(str))return null;
  return str.toLowerCase();
};
async function certs(domain){
  if(cache && cache.domain===domain && cache.exp>Date.now())return cache.keys;
  const response=await fetch(domain+"/cdn-cgi/access/certs",{headers:{accept:"application/json"},cf:{cacheTtl:300}});
  if(!response.ok)throw Error("cert_fetch_failed");
  const result=await response.json();
  if(!Array.isArray(result.keys)||result.keys.length===0||result.keys.length>20)throw Error("certs_invalid");
  cache={domain,keys:result.keys,exp:Date.now()+300000};
  return result.keys;
}
export function isConfigured(env){
  return env?.CASEY_BETA_ENABLED==="true"&&!!teamDomain(env?.CASEY_BETA_TEAM_DOMAIN)
    &&typeof env?.CASEY_BETA_AUD==="string"&&env.CASEY_BETA_AUD.length>=16
    &&emails(env.CASEY_BETA_ALLOWED_EMAILS).size>0
    &&typeof env?.CASEY_BETA_DB?.prepare==="function";
}
export async function verifyBetaUser(request,env){
  if(!isConfigured(env))return null;
  const jwt=request.headers.get("Cf-Access-Jwt-Assertion");
  if(!jwt||jwt.length>12000)return null;
  const parts=jwt.split(".");
  if(parts.length!==3)return null;
  try{
    const header=payload(decode(parts[0]));
    if(header?.alg!=="RS256"||typeof header.kid!=="string"||header.kid.length>256)return null;
    const domain=teamDomain(env.CASEY_BETA_TEAM_DOMAIN);
    const keys=await certs(domain);
    const jwk=keys.find(k=>k.kid===header.kid&&k.kty==="RSA");
    if(!jwk)return null;
    const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    const input=new TextEncoder().encode(parts[0]+"."+parts[1]);
    const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(parts[2]),input);
    if(!valid)return null;
    const claims=payload(decode(parts[1])),now=Math.floor(Date.now()/1000);
    if(claims.iss!==domain||!(Array.isArray(claims.aud)?claims.aud.includes(env.CASEY_BETA_AUD):claims.aud===env.CASEY_BETA_AUD)||
       claims.type!=="app"||!Number.isSafeInteger(claims.exp)||claims.exp<=now||
       (claims.nbf!==undefined&&(!Number.isSafeInteger(claims.nbf)||claims.nbf>now+60))||
       (claims.iat!==undefined&&(!Number.isSafeInteger(claims.iat)||claims.iat>now+60)))return null;
    const email=String(claims.email||"").trim().toLowerCase();
    const sub=String(claims.sub||"");
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||email.length>254||sub.length<6||sub.length>180)return null;
    if(!emails(env.CASEY_BETA_ALLOWED_EMAILS).has(email))return null;
    return {email,sub,admin:emails(env.CASEY_BETA_ADMIN_EMAILS).has(email)};
  }catch{return null;}
}
export {deny};
