import {verifyBetaUser,isConfigured,deny as denyBeta} from "./_beta/auth.js";
// Private Casey V3 pre-launch test. This middleware exists ONLY on the holding branch.
// Requires a high-entropy password. Never expose the unprotected buyer-prep endpoint.
const SALT = "8302e88a76cb72ce493a290d475fd459";
const PASSWORD_HASH = "086ec975e8749d9bdc2cae52fbf148f4d2f48d91aa54a665e6d1752f8b91e6b4";

function denied() {
  return new Response("Private preview. Sign in with the testing credentials.", {
    status:401,
    headers:{
      "WWW-Authenticate": 'Basic realm="Cold Call Casey private test", charset="UTF-8"',
      "Cache-Control":"no-store",
      "X-Robots-Tag":"noindex, nofollow, noarchive",
      "X-Content-Type-Options":"nosniff",
      "Referrer-Policy":"no-referrer"
    }
  });
}
async function approved(authorization) {
  if (!authorization?.startsWith("Basic ")) return false;
  let decoded;
  try { decoded=atob(authorization.slice(6)); } catch { return false; }
  const divider=decoded.indexOf(":");
  if (divider<0) return false;
  const username=decoded.slice(0,divider);
  const password=decoded.slice(divider+1);
  if (username!=="cara" || password.length>180) return false;
  const bytes=new TextEncoder().encode(SALT+":"+password);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)), b=>b.toString(16).padStart(2,"0")).join("");
  if(hash.length!==PASSWORD_HASH.length)return false;
  let difference=0;
  for(let i=0;i<hash.length;i++) difference |= hash.charCodeAt(i)^PASSWORD_HASH.charCodeAt(i);
  return difference===0;
}
export async function onRequest(context) {
  const path=new URL(context.request.url).pathname;
  // Casey invitation beta: only a verified Access identity on an explicit
  // allowlist may see HTML, scripts or APIs. Default is closed.
  if(path==="/casey-beta"||path.startsWith("/casey-beta/")) {
    if(!isConfigured(context.env))return denyBeta(503);
    const identity=await verifyBetaUser(context.request,context.env);
    if(!identity)return denyBeta(403);
    const result=await context.next();
    const headers=new Headers(result.headers);
    headers.set("Cache-Control","private, no-store, max-age=0");
    headers.set("X-Robots-Tag","noindex, nofollow, noarchive");
    headers.set("Referrer-Policy","no-referrer");
    return new Response(result.body,{status:result.status,statusText:result.statusText,headers});
  }
  // Never expose either private-generation function without authentication.
  if(path==="/api/casey-prep"||path.startsWith("/api/casey-prep/")||
     path==="/api/cara-prep"||path.startsWith("/api/cara-prep/")) {
    return new Response("Not found",{status:404,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
  }
  // Retire the old name and route, including assets. Earlier snapshots are preserved in Git.
  if(path==="/cara"||path.startsWith("/cara/")) {
    return new Response("Not found",{status:404,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
  }
  if(path!=="/casey"&&!path.startsWith("/casey/"))return context.next();
  if(!(await approved(context.request.headers.get("Authorization"))))return denied();
  const response=await context.next();
  const headers=new Headers(response.headers);
  headers.set("Cache-Control","private, no-store, max-age=0");
  headers.set("X-Robots-Tag","noindex, nofollow, noarchive");
  headers.set("Referrer-Policy","no-referrer");
  headers.set("X-Content-Type-Options","nosniff");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
