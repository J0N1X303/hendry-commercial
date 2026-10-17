import {verifyBetaUser,isConfigured,deny} from "../_beta/auth.js";
import {onRequestPost as prepare} from "../api/casey-prep.js";
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"private, no-store","x-robots-tag":"noindex"}});
const bounded=(v,n)=>typeof v==="string"?v.trim().slice(0,n):"";
const allowedGoals=new Set(["explore","reconnect","next-step"]);
const allowedChannels=new Set(["call","intro","followup"]);
async function login(request,env){if(!isConfigured(env))return null;return verifyBetaUser(request,env);}
async function tidy(db){await db.prepare("DELETE FROM beta_runs WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%fZ','now')").run();}
export async function onRequestGet({request,env}){
 const user=await login(request,env);if(!user)return deny();
 const url=new URL(request.url);
 if(url.searchParams.get("view")==="me")return response({email:user.email,admin:user.admin,retentionDays:30});
 if(url.searchParams.get("view")==="admin"&&!user.admin)return deny();
 const admin=url.searchParams.get("view")==="admin"&&user.admin;
 const sql=admin?
 "SELECT id,user_email,created_at,channel,status,duration_ms,feedback,error_code FROM beta_runs WHERE expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') ORDER BY created_at DESC LIMIT 100":
 "SELECT id,created_at,channel,status,duration_ms,feedback,error_code FROM beta_runs WHERE user_email=? AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') ORDER BY created_at DESC LIMIT 30";
 const stmt=env.CASEY_BETA_DB.prepare(sql);
 const rows=await (admin?stmt:stmt.bind(user.email)).all();
 return response({items:rows.results||[]});
}
export async function onRequestPost({request,env}){
 const user=await login(request,env);if(!user)return deny();
 if(!String(request.headers.get("content-type")||"").includes("application/json"))return response({error:"content_type"},415);
 let body;try{body=await request.json();}catch{return response({error:"invalid_json"},400);}
 const channel=bounded(body.channel,20),goal=bounded(body.goal||"explore",20),seller=bounded(body.seller,300),context=bounded(body.context,450);
 if(!allowedChannels.has(channel)||!allowedGoals.has(goal)||seller.length<10||context.length<16)return response({error:"input_incomplete"},400);
 // Invited-user request cap enforced by D1, not ephemeral isolate state.
 const {n}=await env.CASEY_BETA_DB.prepare("SELECT COUNT(*) AS n FROM beta_runs WHERE user_email=? AND created_at>strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour')").bind(user.email).first()||{n:0};
 if(n>=12)return response({error:"rate_limited"},429);
 const id=crypto.randomUUID(),started=Date.now();
 await env.CASEY_BETA_DB.prepare("INSERT INTO beta_runs(id,user_email,user_sub,channel,goal,seller_input,buyer_input,status) VALUES(?,?,?,?,?,?,?,'processing')")
 .bind(id,user.email,user.sub,channel,goal,seller,context).run();
 // Reuse the identical Casey inference logic, but explicitly ask for its JSON
 // non-stream response so the stored result corresponds to what the tester sees.
 const hdr=new Headers(request.headers);hdr.set("accept","application/json");
 hdr.set("content-type","application/json");
 const upstream=new Request(request.url,{method:"POST",headers:hdr,body:JSON.stringify({channel,goal,seller,context})});
 let answer,status=503;
 try{
  const result=await prepare({request:upstream,env});
  status=result.status;answer=await result.json();
 }catch{answer={error:"generation_service_unavailable"};}
 const elapsed=Date.now()-started,success=status===200&&answer?.status==="ready";
 await env.CASEY_BETA_DB.prepare("UPDATE beta_runs SET result_json=?,status=?,error_code=?,duration_ms=? WHERE id=? AND user_email=?")
 .bind(success?JSON.stringify(answer.card):null,success?"ready":"failed",success?null:bounded(answer?.error||"unknown",90),elapsed,id,user.email).run();
 // Avoid exposing a result if recording failed: privacy notice promises logging.
 return response({id,...answer,duration_ms:elapsed},status);
}
export async function onRequestPatch({request,env}){
 const user=await login(request,env);if(!user)return deny();
 let body;try{body=await request.json();}catch{return response({error:"invalid_json"},400);}
 const id=bounded(body?.id,50),feedback=bounded(body?.feedback,32),comment=bounded(body?.comment,400);
 if(!/^[0-9a-f-]{36}$/i.test(id)||!["useful","needs-work"].includes(feedback))return response({error:"input_invalid"},400);
 const r=await env.CASEY_BETA_DB.prepare("UPDATE beta_runs SET feedback=?,feedback_comment=? WHERE id=? AND user_email=? AND status='ready' AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')")
 .bind(feedback,comment||null,id,user.email).run();
 return response({saved:(r.meta?.changes||0)>0});
}
export async function onRequestDelete({request,env}){
 const user=await login(request,env);if(!user)return deny();
 // Self-service deletion of all own test records.
 const r=await env.CASEY_BETA_DB.prepare("DELETE FROM beta_runs WHERE user_email=?").bind(user.email).run();
 return response({deleted:r.meta?.changes||0});
}
