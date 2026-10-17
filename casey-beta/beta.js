(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const api="/casey-beta/api";
 let lastCard=null,lastId=null,lastChannel="call",lastCopy="";
 const status=(text)=>{$("message").textContent=text;};
 const request=async(path,options={})=>{
  const response=await fetch(api+path,{credentials:"same-origin",cache:"no-store",...options});
  let data;try{data=await response.json();}catch{throw Error("Non-JSON response (HTTP "+response.status+")");}
  if(!response.ok)throw Error(data.error||"HTTP "+response.status);
  return data;
 };
 const escapeText=value=>String(value??"");
 async function me(){
  try{
   const data=await request("?view=me");
   $("identity").textContent="Signed in: "+data.email;
   if(data.admin){$("admin").hidden=false;await loadAdmin();}
  }catch(error){status("Beta access isn't configured or your invitation hasn't been authorised ("+error.message+").");$("go").disabled=true;}
 }
 const row=(item,asAdmin)=>{
  const div=document.createElement("div");div.className="row";
  const left=document.createElement("span");
  left.textContent=(asAdmin?item.user_email+" · ":"")+(item.channel||"")+" · "+(item.created_at||"")+" · "+item.status+(item.feedback?" · "+item.feedback:"");
  div.append(left);
  const b=document.createElement("button");b.type="button";b.textContent="Review";b.addEventListener("click",()=>showDetail(item.id));div.append(b);
  return div;
 };
 async function history(){
  try{
   const data=await request("");$("history").replaceChildren();
   if(!data.items?.length)$("history").textContent="No preparations yet.";
   else data.items.forEach(item=>$("history").append(row(item,false)));
  }catch(e){$("history").textContent="History unavailable: "+e.message;}
 }
 async function loadAdmin(){
  const box=$("admin-list");
  try{const data=await request("?view=admin");box.replaceChildren();
   if(!data.items?.length)box.textContent="No tester sessions yet.";
   else data.items.forEach(item=>box.append(row(item,true)));
  }catch(e){box.textContent="Admin view unavailable: "+e.message;}
 }
 async function showDetail(id){
  try{
   const data=await request("?id="+encodeURIComponent(id));
   const r=data.item;
   $("detail-text").textContent=JSON.stringify({
    tester:r.user_email||"Your preparation",created:r.created_at,channel:r.channel,goal:r.goal,
    offering:r.seller_input,buyer_context:r.buyer_input,result:r.card,error:r.error_code,
    duration_ms:r.duration_ms,feedback:r.feedback,comment:r.feedback_comment
   },null,2);
   $("detail").hidden=false;$("detail").scrollIntoView({behavior:"smooth"});
  }catch(e){status("Cannot open history: "+e.message);}
 }
 function render(card,channel){
  lastCard=card;lastChannel=channel;
  $("angle").textContent=escapeText(card.angle);
  $("opening-label").textContent=channel==="call"?"Your opening":"Your email";
  $("opening").textContent=escapeText(card.opening);
  $("question-section").hidden=channel!=="call";
  $("question").textContent=escapeText(card.question);
  $("listen").textContent=escapeText(card.listen_for);
  $("buyer").textContent=escapeText(card.pushback_buyer);
  $("reply").textContent=escapeText(card.pushback_reply);
  $("tip").textContent=escapeText(card.tip);
  lastCopy=channel==="call"?[
   "Why this may matter: "+card.angle,
   "Opening: "+card.opening,"Discovery: "+card.question,
   "Listen for: "+card.listen_for,
   "Possible buyer pushback: "+card.pushback_buyer,
   "Suggested reply: "+card.pushback_reply,
   "Coaching tip: "+card.tip
  ].join("\n\n"):card.opening;
  $("result").hidden=false;
  $("result").scrollIntoView({behavior:"smooth"});
 }
 $("generate").addEventListener("submit",async ev=>{
  ev.preventDefault();
  if(!$("acknowledge").checked){status("Please acknowledge the private test data policy.");return;}
  const data=new FormData(ev.currentTarget),body={
   channel:data.get("channel"),goal:data.get("goal"),seller:data.get("seller"),context:data.get("context")
  };
  $("go").disabled=true;$("result").hidden=true;$("progress").hidden=false;status("");
  const started=Date.now();
  const tick=setInterval(()=>$("elapsed").textContent=Math.round((Date.now()-started)/1000)+"s",1000);
  try{
   // One POST. Do not blind-retry a possible completed inference.
   const result=await request("",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
   lastId=result.id;render(result.card,body.channel);
   await history();if(!$("admin").hidden)await loadAdmin();
  }catch(e){status("Casey couldn't complete this briefing ("+e.message+"). Your inputs remain here; the attempt may have reached the AI service.");}
  finally{clearInterval(tick);$("go").disabled=false;$("progress").hidden=true;}
 });
 $("copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(lastCopy);status("Copied.");}catch{status("Copy failed; select the text manually.");}});
 document.querySelectorAll("[data-feedback]").forEach(button=>button.addEventListener("click",async()=>{
  if(!lastId)return;
  try{const data=await request("",{method:"PATCH",headers:{"content-type":"application/json"},
   body:JSON.stringify({id:lastId,feedback:button.dataset.feedback,comment:$("comment").value})});
   $("feedback-status").textContent=data.saved?"Feedback saved. Thank you.":"Feedback couldn't be saved.";
   await history();if(!$("admin").hidden)await loadAdmin();
  }catch(e){$("feedback-status").textContent="Feedback error: "+e.message;}
 }));
 $("refresh").addEventListener("click",history);
 $("delete").addEventListener("click",async()=>{
  if(!confirm("Delete all your beta inputs, outputs and feedback? This cannot be undone."))return;
  try{await request("",{method:"DELETE"});$("result").hidden=true;lastCard=null;lastId=null;await history();status("Your saved test records have been deleted.");}
  catch(e){status("Couldn't delete your history: "+e.message);}
 });
 $("close-detail").addEventListener("click",()=>$("detail").hidden=true);
 void me().then(history);
})();